import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDocumentDto } from './dtos/create-document.dto';
import { SendDocumentToClientDto } from './dtos/send-document-to-client.dto';
import { User } from 'src/types/extended-request.types';
import { randomBytes } from 'crypto';
import { MailService } from 'src/mail/mail.service';
import { $Enums, Prisma } from '@prisma/client';
import { InvoicePaymentFeeService } from '../payment-fee/invoice-payment-fee.service';
import { ConfigService } from '@nestjs/config';
import { CreatePaymentLinkInput } from 'src/Adapters/PaymentAdapters/Types/InputTypes/CreatePaymentLinkInput.types';
import { PaymentService } from 'src/Adapters/PaymentAdapters/payment.service';
import { PdfService } from 'src/pdf/pdf.service';
import {
  buildInstalmentSchedule,
  parseDateOnly,
} from './instalment-plan.utils';

@Injectable()
export class DocumentService {
  callbackUrl: string;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    private readonly pdfService: PdfService,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
    private readonly invoicePaymentFeeService: InvoicePaymentFeeService,
  ) {
    this.callbackUrl =
      this.configService.get<string>('BRIDGE_CALLBACK_URL') || '';
  }

  async createDocument(data: CreateDocumentDto, user: User) {
    try {
      const {
        lineItems,
        type = 'ESTIMATE',
        ...documentData
      } = data;
      const companyId = await this.getActiveCompanyId(user, true);
      const documentNumber = await this.createDocumentNumber(type, companyId);

      if (type !== 'INVOICE' && data.instalmentsDetails) {
        throw new BadRequestException(
          'Un échéancier ne peut être défini que pour une facture.',
        );
      }

      const totalPriceExludingTax = lineItems.reduce((acc, item) => {
        const basePrice = item.unitPrice * item.quantity;
        return acc + basePrice;
      }, 0);

      const totalVatAmount = lineItems.reduce((acc, item) => {
        const basePrice = item.unitPrice * item.quantity;
        const taxAmount = basePrice * ((item.taxRate ? item.taxRate : 0) / 100);
        return acc + taxAmount;
      }, 0);

      const totalDocumentPrice = totalPriceExludingTax + totalVatAmount;

      const document = await this.prismaService.$transaction(async (prisma) => {
        const createdDocument = await prisma.document.create({
          data: {
          clientName: documentData.client.name,
          clientEmail: documentData.client.email,
          clientAddress: documentData.client.address,
          clientCity: documentData.client.city,
          clientCountry: documentData.client.country,
          clientPostalCode: documentData.client.postalCode,
          totalPriceExcludingTax: totalPriceExludingTax,
          totalPrice: totalDocumentPrice,
          documentNumber,
          type,
          isFromEstimate: type === 'ESTIMATE',
          estimateStatus: 'DRAFT',
          invoiceStatus: 'DRAFT',
          companyId,
          paymentDueAt: new Date(data.documentDates.dueDate),
          },
        });

        for (const lineItem of lineItems) {
          const wtPrice = lineItem.unitPrice * lineItem.quantity;
          const totalPrice =
            wtPrice +
            (lineItem.taxRate ? (wtPrice * lineItem.taxRate) / 100 : 0);
          await prisma.documentService.create({
            data: {
              description: lineItem.description,
              quantity: lineItem.quantity,
              taxRate: lineItem.taxRate,
              unitPrice: lineItem.unitPrice,
              unit: lineItem.unit,
              documentId: createdDocument.id,
              wtPrice,
              totalPrice,
            },
          });
        }

        if (type === 'INVOICE') {
          await this.syncInvoiceInstalmentPlan(
            prisma,
            createdDocument,
            data.instalmentsDetails,
          );
        }

        return createdDocument;
      });

      return {
        message: `${type === 'INVOICE' ? 'Facture' : 'Devis'} créé avec succès.`,
        document,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Une erreur est survenue lors de la création de la facture.',
      );
    }
  }

  async updateDraftDocument(
    documentId: string,
    data: CreateDocumentDto,
    user: User,
  ) {
    try {
      const { lineItems, ...documentData } = data;
      const companyId = await this.getActiveCompanyId(user, true);
      const document = await this.prismaService.document.findFirst({
        where: {
          id: documentId,
          companyId,
        },
        include: {
          services: true,
        },
      });

      if (!document) {
        throw new BadRequestException(
          "Document introuvable ou vous n'avez pas la permission d'y accéder.",
        );
      }

      if (document.type !== 'INVOICE' && data.instalmentsDetails) {
        throw new BadRequestException(
          'Un échéancier ne peut être défini que pour une facture.',
        );
      }

      if (document.type === 'INVOICE' && document.isFromEstimate !== false) {
        if (document.invoiceStatus !== 'DRAFT') {
          throw new BadRequestException(
            'Une facture envoyée ne peut plus être modifiée.',
          );
        }

        const updatedDocument = await this.prismaService.$transaction(async (prisma) => {
          const updated = await prisma.document.update({
            where: { id: document.id },
            data: { paymentDueAt: new Date(data.documentDates.dueDate) },
          });
          await this.syncInvoiceInstalmentPlan(
            prisma,
            updated,
            data.instalmentsDetails,
          );
          return updated;
        });

        return {
          message: "Date d'échéance de la facture mise à jour avec succès.",
          document: updatedDocument,
        };
      }

      const totalPriceExludingTax = lineItems.reduce((acc, item) => {
        const basePrice = item.unitPrice * item.quantity;
        return acc + basePrice;
      }, 0);

      const totalVatAmount = lineItems.reduce((acc, item) => {
        const basePrice = item.unitPrice * item.quantity;
        const taxAmount = basePrice * ((item.taxRate ? item.taxRate : 0) / 100);
        return acc + taxAmount;
      }, 0);

      const totalDocumentPrice = totalPriceExludingTax + totalVatAmount;
      const existingServiceIds = new Set(
        document.services.map((service) => service.id),
      );
      const submittedServiceIds = lineItems
        .map((lineItem) => lineItem.id)
        .filter((serviceId): serviceId is string => Boolean(serviceId));

      if (new Set(submittedServiceIds).size !== submittedServiceIds.length) {
        throw new BadRequestException(
          "Une ligne de service ne peut être envoyée qu'une seule fois.",
        );
      }

      if (
        submittedServiceIds.some(
          (serviceId) => !existingServiceIds.has(serviceId),
        )
      ) {
        throw new BadRequestException(
          'Une ou plusieurs lignes de service sont introuvables.',
        );
      }

      const serviceIdsToDelete = document.services
        .filter((service) => !submittedServiceIds.includes(service.id))
        .map((service) => service.id);

      const updatedDocument = await this.prismaService.$transaction(
        async (prisma) => {
          if (serviceIdsToDelete.length > 0) {
            await prisma.documentService.deleteMany({
              where: {
                documentId: document.id,
                id: { in: serviceIdsToDelete },
              },
            });
          }

          const updatedDocument = await prisma.document.update({
            where: { id: document.id },
            data: {
              clientName: documentData.client.name,
              clientEmail: documentData.client.email,
              clientAddress: documentData.client.address,
              clientCity: documentData.client.city,
              clientCountry: documentData.client.country,
              clientPostalCode: documentData.client.postalCode,
              totalPriceExcludingTax: totalPriceExludingTax,
              totalPrice: totalDocumentPrice,
              paymentDueAt: new Date(data.documentDates.dueDate),
            },
          });

          for (const lineItem of lineItems) {
            const wtPrice = lineItem.unitPrice * lineItem.quantity;
            const totalPrice =
              wtPrice +
              (lineItem.taxRate ? (wtPrice * lineItem.taxRate) / 100 : 0);
            const serviceData = {
              description: lineItem.description,
              quantity: lineItem.quantity,
              taxRate: lineItem.taxRate,
              unitPrice: lineItem.unitPrice,
              unit: lineItem.unit,
              wtPrice,
              totalPrice,
            };

            if (lineItem.id) {
              await prisma.documentService.update({
                where: { id: lineItem.id },
                data: serviceData,
              });
            } else {
              await prisma.documentService.create({
                data: {
                  ...serviceData,
                  documentId: document.id,
                },
              });
            }
          }

          if (updatedDocument.type === 'INVOICE') {
            await this.syncInvoiceInstalmentPlan(
              prisma,
              updatedDocument,
              data.instalmentsDetails,
            );
          }

          return updatedDocument;
        },
      );

      return {
        message: 'Document mis à jour avec succès.',
        document: updatedDocument,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Une erreur est survenue lors de la mise à jour du document.',
      );
    }
  }

  private async syncInvoiceInstalmentPlan(
    prisma: Prisma.TransactionClient,
    invoice: { id: string; totalPrice: number; createdAt: Date },
    instalmentsDetails?: {
      numberOfInstalments: 2 | 3;
      firstDueDate: string;
    },
  ) {
    if (!instalmentsDetails) {
      await prisma.invoicePaymentMode.upsert({
        where: { invoiceId: invoice.id },
        create: { invoiceId: invoice.id, paymentMode: 'ONE_TIME' },
        update: {
          paymentMode: 'ONE_TIME',
          paymentModeFrequency: null,
          numberOfInstalments: null,
          amountPerInstalmentInCents: null,
        },
      });
      await prisma.invoiceInstalmentPlan.deleteMany({
        where: { invoiceId: invoice.id },
      });
      return;
    }

    const firstDueDate = parseDateOnly(instalmentsDetails.firstDueDate);
    const issuedAt = new Date(invoice.createdAt);
    const issueDate = new Date(
      Date.UTC(
        issuedAt.getUTCFullYear(),
        issuedAt.getUTCMonth(),
        issuedAt.getUTCDate(),
        12,
      ),
    );
    if (Number.isNaN(firstDueDate.getTime()) || firstDueDate < issueDate) {
      throw new BadRequestException(
        "La première échéance ne peut pas être antérieure à la date d'émission de la facture.",
      );
    }

    const totalAmountInCents = Math.round(invoice.totalPrice * 100);
    const schedule = buildInstalmentSchedule(
      totalAmountInCents,
      instalmentsDetails.numberOfInstalments,
      firstDueDate,
    );
    const amountPerInstalmentInCents = Math.floor(
      totalAmountInCents / instalmentsDetails.numberOfInstalments,
    );

    await prisma.invoicePaymentMode.upsert({
      where: { invoiceId: invoice.id },
      create: {
        invoiceId: invoice.id,
        paymentMode: 'INSTALMENTS',
        paymentModeFrequency: 'MONTHLY',
        numberOfInstalments: instalmentsDetails.numberOfInstalments,
        amountPerInstalmentInCents,
      },
      update: {
        paymentMode: 'INSTALMENTS',
        paymentModeFrequency: 'MONTHLY',
        numberOfInstalments: instalmentsDetails.numberOfInstalments,
        amountPerInstalmentInCents,
      },
    });

    await prisma.invoiceInstalmentPlan.deleteMany({
      where: { invoiceId: invoice.id },
    });
    await prisma.invoiceInstalmentPlan.create({
      data: {
        invoiceId: invoice.id,
        totalAmountInCents,
        numberOfInstalments: instalmentsDetails.numberOfInstalments,
        amountPerInstalmentInCents,
        startDate: firstDueDate,
        // A provider reference is required by the current schema. It is an
        // internal placeholder until a future provider integration replaces it.
        providerReference: `onetto-${randomBytes(16).toString('hex')}`,
        invoicePaymentInstalments: {
          create: schedule.map((instalment) => ({
            instalmentNumber: instalment.sequence,
            amountInCents: instalment.amountInCents,
            dueDate: instalment.dueDate,
          })),
        },
      },
    });
  }

  async convertEstimateToInvoice(documentId: string, user: User) {
    try {
      const companyId = await this.getActiveCompanyId(user, true);
      const document = await this.prismaService.document.findFirst({
        where: {
          id: documentId,
          companyId,
          type: 'ESTIMATE',
          estimateStatus: 'ACCEPTED',
        },
        include: {
          services: true,
          convertedDocuments: {
            where: { type: 'INVOICE' },
            select: { id: true },
          },
        },
      });

      if (!document) {
        throw new BadRequestException(
          'Seul un devis accepté peut être transformé en facture.',
        );
      }

      if (document.convertedDocuments.length > 0) {
        throw new BadRequestException(
          'Ce devis a déjà été transformé en facture.',
        );
      }

      const invoiceNumber = await this.createDocumentNumber(
        'INVOICE',
        companyId,
      );

      const invoice = await this.prismaService.document.create({
        data: {
          clientName: document.clientName,
          clientEmail: document.clientEmail,
          clientAddress: document.clientAddress,
          clientCity: document.clientCity,
          clientCountry: document.clientCountry,
          clientPostalCode: document.clientPostalCode,
          totalPriceExcludingTax: document.totalPriceExcludingTax,
          totalPrice: document.totalPrice,
          documentNumber: invoiceNumber,
          type: 'INVOICE',
          isFromEstimate: true,
          sourceDocumentId: document.id,
          estimateStatus: 'ACCEPTED',
          invoiceStatus: 'DRAFT',
          companyId,
          createdAt: new Date(),
          paymentDueAt: document.paymentDueAt,
        },
      });

      await this.prismaService.$transaction(async (prisma) => {
        for (const service of document.services) {
          await prisma.documentService.create({
            data: {
              description: service.description,
              quantity: service.quantity,
              taxRate: service.taxRate,
              unitPrice: service.unitPrice,
              unit: service.unit,
              documentId: invoice.id,
              wtPrice: service.wtPrice,
              totalPrice: service.totalPrice,
            },
          });
        }
      });

      return {
        message: 'Devis converti en facture avec succès.',
        document: invoice,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Une erreur est survenue lors de la conversion du devis en facture.',
      );
    }
  }

  // chercher en fonction l'utilisateur connecté
  async createDocumentNumber(
    type: 'ESTIMATE' | 'INVOICE',
    companyId: string,
  ): Promise<string> {
    const currentYear = new Date().getFullYear();
    const lastDocument = await this.prismaService.document.findFirst({
      where: { companyId, type },
      orderBy: { createdAt: 'desc' },
    });

    let lastDocumentNumber = 0;
    if (lastDocument) {
      const lastDocumentNumberParts = lastDocument.documentNumber?.split('-');
      if (
        lastDocumentNumberParts &&
        lastDocumentNumberParts.length === 3 &&
        lastDocumentNumberParts[1] === currentYear.toString()
      ) {
        lastDocumentNumber = parseInt(lastDocumentNumberParts[2], 10);
      }
    }

    const newDocumentNumber = lastDocumentNumber + 1;
    const prefix = type === 'ESTIMATE' ? 'DEV' : 'FACT';
    return `#${prefix}-${currentYear}-${newDocumentNumber.toString().padStart(4, '0')}`;
  }

  async getDocumentsByUser(
    user: User,
    withServices: boolean = true,
    type?: 'INVOICE' | 'ESTIMATE',
    status?: string,
    page = 1,
    pageSize = 5,
  ) {
    try {
      const companyId = await this.getActiveCompanyId(user);
      const documentTypeFilter: Prisma.DocumentWhereInput = type
        ? {
            type,
            ...(type === 'ESTIMATE' ? { isLastVersion: true } : {}),
            ...(status
              ? type === 'INVOICE'
                ? {
                    invoiceStatus:
                      status === 'PAID'
                        ? { in: ['PAID', 'PAID_MANUALLY'] }
                        : (status as Prisma.EnumInvoiceStatusFilter),
                  }
                : { estimateStatus: status as Prisma.EnumEstimateStatusFilter }
              : {}),
          }
        : {
            OR: [
              { type: 'INVOICE' },
              { type: 'ESTIMATE', isLastVersion: true },
            ],
          };

      if (type) {
        const where = { companyId, ...documentTypeFilter };
        const total = await this.prismaService.document.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const currentPage = Math.min(Math.max(1, page), totalPages);
        const documents = await this.prismaService.document.findMany({
          where,
          include: {
            services: withServices,
            invoicePaymentMode: true,
            invoiceInstalmentPlan: {
              include: {
                invoicePaymentInstalments: { orderBy: { instalmentNumber: 'asc' } },
              },
            },
            convertedDocuments: {
              where: { type: 'INVOICE' },
              select: { id: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (currentPage - 1) * pageSize,
          take: pageSize,
        });

        return {
          documents,
          pagination: {
            page: currentPage,
            pageSize,
            total,
            totalPages,
          },
        };
      }

      const documents = await this.prismaService.document.findMany({
        where: {
          companyId,
          ...documentTypeFilter,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          services: withServices,
          invoicePaymentMode: true,
          invoiceInstalmentPlan: {
            include: {
              invoicePaymentInstalments: { orderBy: { instalmentNumber: 'asc' } },
            },
          },
          convertedDocuments: {
            where: { type: 'INVOICE' },
            select: { id: true },
          },
        },
      });

      return {
        estimates: documents.filter((doc) => doc.type === 'ESTIMATE'),
        invoices: documents.filter((doc) => doc.type === 'INVOICE'),
      };
    } catch (error: any) {
      console.error('Error fetching Documents by user:', error);
      throw new InternalServerErrorException(
        "Une erreur est survenue lors de la récupération des factures de l'utilisateur.",
      );
    }
  }

  async getInvoiceStats(user: User) {
    const companyId = await this.getActiveCompanyId(user);
    const groupedStats = await this.prismaService.document.groupBy({
      by: ['invoiceStatus'],
      where: {
        companyId,
        type: 'INVOICE',
        invoiceStatus: {
          in: ['PAID', 'PAID_MANUALLY', 'PENDING', 'OVERDUE', 'DRAFT'],
        },
      },
      _count: { _all: true },
      _sum: { totalPrice: true },
    });

    const statsByStatus = new Map(
      groupedStats.map((stat) => [
        stat.invoiceStatus,
        {
          count: stat._count._all,
          totalAmount: stat._sum.totalPrice ?? 0,
        },
      ]),
    );

    const getStat = (...statuses: $Enums.InvoiceStatus[]) =>
      statuses.reduce(
        (total, status) => {
          const stat = statsByStatus.get(status);

          return {
            count: total.count + (stat?.count ?? 0),
            totalAmount: total.totalAmount + (stat?.totalAmount ?? 0),
          };
        },
        { count: 0, totalAmount: 0 },
      );

    return {
      paid: getStat('PAID', 'PAID_MANUALLY'),
      pending: getStat('PENDING'),
      overdue: getStat('OVERDUE'),
      draft: getStat('DRAFT'),
    };
  }

  async getDocumentById(
    documentId: string,
    user: User,
    withServices: boolean = true,
  ) {
    try {
      const companyId = await this.getActiveCompanyId(user);
      const document = await this.prismaService.document.findFirst({
        where: {
          id: documentId,
          companyId,
        },
        include: {
          services: withServices,
          convertedDocuments: {
            where: { type: 'INVOICE' },
            select: { id: true },
          },
        },
      });

      if (!document) {
        throw new BadRequestException(
          "Document introuvable ou vous n'avez pas la permission d'y accéder.",
        );
      }

      const latestVersion = await this.prismaService.document.findFirst({
        where: {
          companyId,
          documentNumber: document.documentNumber,
          type: document.type,
        },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });

      return {
        ...document,
        isEditable:
          (document.type === 'ESTIMATE' &&
            document.estimateStatus === 'DRAFT' &&
            document.versionNumber === latestVersion?.versionNumber) ||
          (document.type === 'INVOICE' && document.invoiceStatus === 'DRAFT'),
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error fetching document by ID:', error);
      throw new InternalServerErrorException(
        'Une erreur est survenue lors de la récupération du document.',
      );
    }
  }

  async generateDocumentPdf(documentId: string, user: User): Promise<Buffer> {
    const document = await this.getDocumentById(documentId, user, true);
    const company = await this.getInvoiceCompany(document.companyId);

    return this.pdfService.generate({
      ...document,
      company,
    });
  }

  async getNegociationByToken(negociationToken: string) {
    return this.prismaService.estimateNegociation.findUnique({
      where: { negociationToken },
      select: {
        id: true,
        message: true,
        proposedTotalPrice: true,
        status: true,
        document: {
          select: {
            id: true,
            documentNumber: true,
            type: true,
            clientName: true,
            clientEmail: true,
            clientAddress: true,
            clientCity: true,
            clientPostalCode: true,
            clientCountry: true,
            totalPrice: true,
            totalPriceExcludingTax: true,
            createdAt: true,
            sentAt: true,
            paymentDueAt: true,
            services: {
              select: {
                id: true,
                description: true,
                quantity: true,
                unitPrice: true,
                unit: true,
                taxRate: true,
                wtPrice: true,
                totalPrice: true,
              },
            },
            company: {
              select: {
                name: true,
                email: true,
                phoneNumber: true,
                siren: true,
                address: true,
                postalCode: true,
                city: true,
                country: true,
                subjectToVat: true,
                vatNumber: true,
              },
            },
          },
        },
      },
    });
  }

  async renegociateByToken(negociationToken: string, message: string) {
    const result = await this.prismaService.$transaction(async (prisma) => {
      const negociation = await prisma.estimateNegociation.findFirst({
        where: {
          negociationToken,
          status: 'PENDING',
          document: { type: 'ESTIMATE' },
        },
        select: { id: true, documentId: true },
      });

      if (!negociation) {
        return null;
      }

      await prisma.estimateNegociation.update({
        where: { id: negociation.id },
        data: { message, status: 'RENEGOCIATED' },
      });
      await prisma.document.update({
        where: { id: negociation.documentId },
        data: { estimateStatus: 'SUPERSEDED' },
      });

      return { success: true };
    });

    return result;
  }

  async setNegociationStatus(
    negociationToken: string,
    status: 'ACCEPTED' | 'REJECTED',
  ) {
    const result = await this.prismaService.$transaction(async (prisma) => {
      const negociation = await prisma.estimateNegociation.findFirst({
        where: {
          negociationToken,
          status: 'PENDING',
          document: { type: 'ESTIMATE' },
        },
        select: { id: true, documentId: true },
      });

      if (!negociation) {
        return null;
      }

      await prisma.estimateNegociation.update({
        where: { id: negociation.id },
        data: { status },
      });

      if (status === 'ACCEPTED' || status === 'REJECTED') {
        await prisma.document.update({
          where: { id: negociation.documentId },
          data: { estimateStatus: status },
        });
      }

      return { success: true };
    });

    return result;
  }

  async getNegociationsByDocument(documentId: string, user: User) {
    const companyId = await this.getActiveCompanyId(user);

    return this.prismaService.estimateNegociation.findMany({
      where: { documentId, document: { companyId } },
      select: {
        id: true,
        negociationToken: true,
        message: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocumentVersions(documentId: string, user: User) {
    const companyId = await this.getActiveCompanyId(user);
    const document = await this.prismaService.document.findFirst({
      where: { id: documentId, companyId },
      select: { documentNumber: true, type: true },
    });

    if (!document) {
      throw new BadRequestException(
        "Document introuvable ou vous n'avez pas la permission d'y accéder.",
      );
    }

    const versions = await this.prismaService.document.findMany({
      where: {
        companyId,
        documentNumber: document.documentNumber,
        type: document.type,
      },
      select: {
        id: true,
        versionNumber: true,
        estimateStatus: true,
      },
      orderBy: { versionNumber: 'desc' },
    });
    const latestVersion = versions[0]?.versionNumber;

    return versions.map((version) => ({
      ...version,
      isEditable:
        document.type === 'ESTIMATE' &&
        version.estimateStatus === 'DRAFT' &&
        version.versionNumber === latestVersion,
    }));
  }

  async createNewDocumentVersion(documentId: string, user: User) {
    const companyId = await this.getActiveCompanyId(user, true);
    const sourceDocument = await this.prismaService.document.findFirst({
      where: {
        id: documentId,
        companyId,
        type: 'ESTIMATE',
        estimateStatus: 'SUPERSEDED',
        isLastVersion: true,
      },
      include: { services: true },
    });

    if (!sourceDocument || !sourceDocument.documentNumber) {
      throw new BadRequestException(
        'Seul un devis remplacé peut donner lieu à une nouvelle version.',
      );
    }

    return this.prismaService.$transaction(async (prisma) => {
      const latestVersion = await prisma.document.findFirst({
        where: {
          companyId,
          documentNumber: sourceDocument.documentNumber,
          type: 'ESTIMATE',
        },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });

      const document = await prisma.document.create({
        data: {
          companyId,
          type: 'ESTIMATE',
          documentNumber: sourceDocument.documentNumber,
          versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
          isLastVersion: true,
          clientName: sourceDocument.clientName,
          clientEmail: sourceDocument.clientEmail,
          clientAddress: sourceDocument.clientAddress,
          clientCity: sourceDocument.clientCity,
          clientPostalCode: sourceDocument.clientPostalCode,
          clientCountry: sourceDocument.clientCountry,
          totalPriceExcludingTax: sourceDocument.totalPriceExcludingTax,
          totalPrice: sourceDocument.totalPrice,
          paymentDueAt: sourceDocument.paymentDueAt,
          estimateStatus: 'DRAFT',
          invoiceStatus: 'DRAFT',
        },
      });

      await prisma.document.update({
        where: { id: sourceDocument.id },
        data: { isLastVersion: false },
      });

      await prisma.documentService.createMany({
        data: sourceDocument.services.map((service) => ({
          documentId: document.id,
          description: service.description,
          quantity: service.quantity,
          unitPrice: service.unitPrice,
          unit: service.unit,
          taxRate: service.taxRate,
          wtPrice: service.wtPrice,
          totalPrice: service.totalPrice,
        })),
      });

      return { document };
    });
  }

  private async getActiveCompanyId(
    user: User,
    requireActive = false,
  ): Promise<string> {
    if (!user.lastConnectedCompanyId) {
      throw new BadRequestException(
        'Sélectionnez une entreprise avant de gérer des factures.',
      );
    }

    if (requireActive) {
      const company = await this.prismaService.company.findUnique({
        where: { id: user.lastConnectedCompanyId },
        select: { status: true },
      });

      if (!company || company.status === 'CLOSED') {
        throw new BadRequestException(
          'Une entreprise fermée ne peut pas créer de factures.',
        );
      }
    }

    return user.lastConnectedCompanyId;
  }

  async massDeleteDocuments(documentIds: string[], user: User) {
    try {
      const companyId = await this.getActiveCompanyId(user);
      const deleteResult = await this.prismaService.document.deleteMany({
        where: {
          id: { in: documentIds },
          companyId,
        },
      });

      if (deleteResult.count === 0) {
        throw new BadRequestException(
          'Aucun document supprimé. Vérifiez les IDs fournis.',
        );
      }

      return {
        success: true,
        message: `${deleteResult.count} document(s) supprimé(s) avec succès.`, // dire que la suppssion inclu aussi les différentes versions des documents
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error deleting documents:', error);
      throw new InternalServerErrorException(
        'Une erreur est survenue lors de la suppression des documents.',
      );
    }
  }

  async sendDocumentToClient(
    documentId: string,
    user: User,
    sendData: SendDocumentToClientDto = {},
  ) {
    try {
      const document = await this.getDocumentById(documentId, user, true);

      if (!document) {
        throw new BadRequestException(
          "Document introuvable ou vous n'avez pas la permission d'y accéder.",
        );
      }

      const canSend = await this.isCompanyUser(user.id, document.companyId);
      if (!canSend) {
        throw new BadRequestException(
          "Vous n'avez pas la permission d'envoyer ce document.",
        );
      }

      if (document.type === 'INVOICE' && document.invoiceStatus !== 'DRAFT') {
        throw new BadRequestException('Cette facture a déjà été envoyée.');
      }

      const isInvoice = document.type === 'INVOICE';
      const negociation = !isInvoice
        ? await this.prismaService.estimateNegociation.create({
            data: {
              documentId: document.id,
              message: '',
              proposedTotalPrice: document.totalPrice,
              negociationToken: randomBytes(16).toString('hex'),
            },
          })
        : null;
      const documentUrl = negociation
        ? `${process.env.FRONTEND_URL}/negociations?token=${negociation.negociationToken}`
        : null;

      const company = isInvoice
        ? await this.getInvoiceCompany(document.companyId)
        : null;

      const paymentDetails = isInvoice
        ? await this.getPaymentModeDetails(document.id)
        : null;
      const paymentLink = isInvoice
        ? await this.createInvoicePaymentLink(
            paymentDetails!.paymentMode,
            document,
            company!,
            user,
            paymentDetails!.instalmentsDetails,
          )
        : undefined;

      const invoicePdf = isInvoice
        ? await this.pdfService.generate({
            ...document,
            sentAt: new Date(),
            company: company!,
          })
        : null;

      const mailContent = isInvoice
        ? this.mailService.createInvoiceMail({
            clientName: document.clientName,
            documentNumber: document.documentNumber,
            totalPrice: document.totalPrice,
            paymentDueAt: document.paymentDueAt,
            companyName: company!.name,
            companyEmail: company!.email,
            paymentLink: paymentLink!,
          })
        : this.mailService.createEstimateMail({
            clientName: document.clientName,
            documentNumber: document.documentNumber,
            totalPrice: document.totalPrice,
            paymentDueAt: document.paymentDueAt,
            senderName: `${user.firstname} ${user.lastname}`,
            documentUrl: documentUrl!,
          });

      await this.mailService.sendMail({
        to: document.clientEmail,
        ...mailContent,
        attachments: invoicePdf
          ? [
              this.createInvoiceAttachment(
                document.id,
                document.documentNumber,
                invoicePdf,
              ),
            ]
          : undefined,
      });

      await this.markDocumentAsDelivered(document.id, isInvoice);

      return {
        success: true,
        message: 'Document envoyé au client avec succès.',
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error sending document to client:', error);
      throw new InternalServerErrorException(
        "Une erreur est survenue lors de l'envoi du document au client.",
      );
    }
  }

  async retryInvoicePayment(documentId: string, user: User) {
    try {
      const document = await this.getDocumentById(documentId, user, true);

      if (
        document.type !== 'INVOICE' ||
        document.invoiceStatus !== 'REJECTED'
      ) {
        throw new BadRequestException(
          'Seule une facture dont le paiement a été refusé peut être relancée.',
        );
      }

      const canRetryPayment = await this.isCompanyUser(
        user.id,
        document.companyId,
      );
      if (!canRetryPayment) {
        throw new BadRequestException(
          "Vous n'avez pas la permission de relancer ce paiement.",
        );
      }

      const { paymentMode, instalmentsDetails } =
        await this.getPaymentModeDetails(documentId);

      const company = await this.getInvoiceCompany(document.companyId);
      const paymentLink = await this.createInvoicePaymentLink(
        paymentMode,
        document,
        company,
        user,
        instalmentsDetails,
      );
      const invoicePdf = await this.pdfService.generate({
        ...document,
        company,
      });
      const mailContent = this.mailService.createInvoicePaymentRetryMail({
        clientName: document.clientName,
        documentNumber: document.documentNumber,
        totalPrice: document.totalPrice,
        paymentDueAt: document.paymentDueAt,
        companyName: company.name,
        companyEmail: company.email,
        paymentLink,
      });

      await this.mailService.sendMail({
        to: document.clientEmail,
        ...mailContent,
        attachments: [
          this.createInvoiceAttachment(
            document.id,
            document.documentNumber,
            invoicePdf,
          ),
        ],
      });

      await this.prismaService.document.update({
        where: { id: document.id },
        data: { invoiceStatus: 'PENDING' },
      });

      return {
        success: true,
        message: 'Un nouveau lien de paiement a été envoyé au client.',
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error retrying invoice payment:', error);
      throw new InternalServerErrorException(
        'Une erreur est survenue lors de la relance du paiement.',
      );
    }
  }

  async getPaymentModeDetails(documentId: string): Promise<{
    paymentMode: CreatePaymentLinkInput['paymentMode'];
    instalmentsDetails: CreatePaymentLinkInput['instalments_details'];
  }> {
    const paymentMode = await this.prismaService.invoicePaymentMode.findUnique({
      where: { invoiceId: documentId },
    });

    if (!paymentMode) {
      return { paymentMode: 'ONE_TIME', instalmentsDetails: undefined };
    }

    let instalmentsDetails: CreatePaymentLinkInput['instalments_details'];
    if (paymentMode.paymentMode === 'INSTALMENTS') {
      if (
        !paymentMode.paymentModeFrequency ||
        !paymentMode.numberOfInstalments ||
        !paymentMode.amountPerInstalmentInCents
      ) {
        throw new BadRequestException(
          'Les détails des échéances de cette facture sont incomplets.',
        );
      }

      instalmentsDetails = {
        frequency: paymentMode.paymentModeFrequency,
        numberOfInstalments: paymentMode.numberOfInstalments,
        amountPerInstalmentInCents: paymentMode.amountPerInstalmentInCents,
      };
    }

    return {
      paymentMode: paymentMode.paymentMode,
      instalmentsDetails,
    };
  }

  async isCompanyUser(userId: string, companyId: string): Promise<boolean> {
    const companyUser = await this.prismaService.companyUser.findFirst({
      where: {
        userId,
        companyId,
      },
    });

    return !!companyUser;
  }

  private async createInvoicePaymentLink(
    paymentMode: CreatePaymentLinkInput['paymentMode'],
    document: {
      id: string;
      documentNumber: string | null;
      totalPrice: number;
      clientName: string;
      clientEmail: string;
      clientAddress: string;
      clientCity: string;
      clientPostalCode: string;
      clientCountry: string;
      paymentDueAt: Date;
    },
    company: { id: string; name: string; email: string; IBAN: string },
    user: User,
    instalmentsDetails: CreatePaymentLinkInput['instalments_details'],
  ): Promise<string> {
    const paymentAccessToken = randomBytes(32).toString('hex');
    const paymentProvider = this.configService.get<'BRIDGE' | 'GOCARDLESS'>(
      'PAYMENT_PROVIDER',
    );
    if (!paymentProvider) {
      throw new InternalServerErrorException(
        "Le fournisseur de paiement n'est pas configuré.",
      );
    }

    const paymentLinkData: CreatePaymentLinkInput = {
      paymentMode,
      instalments_details: instalmentsDetails,
      description: `Paiement de la facture ${document.documentNumber} pour ${document.clientName}`,
      invoiceId: document.id,
      // Bridge expects an amount in euros, whereas GoCardless expects cents.
      amount:
        paymentProvider === 'GOCARDLESS'
          ? Math.round(document.totalPrice * 100)
          : document.totalPrice,
      currency: 'EUR',
      companyId: company.id,
      customer: {
        email: document.clientEmail,
        ...this.toGoCardlessCustomerDetails(document),
      },
    };

    await this.paymentService.createPaymentLink(
      paymentProvider,
      paymentLinkData,
      paymentAccessToken,
    );

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return `${frontendUrl}/payment?token=${paymentAccessToken}`;
  }

  private toGoCardlessCustomerDetails(document: {
    clientName: string;
    clientAddress: string;
    clientCity: string;
    clientPostalCode: string;
    clientCountry: string;
  }): Omit<CreatePaymentLinkInput['customer'], 'email'> {
    const nameParts = document.clientName.trim().split(/\s+/);
    const country = document.clientCountry.trim().toUpperCase();
    const countryCode = country === 'FRANCE' ? 'FR' : /^[A-Z]{2}$/.test(country) ? country : undefined;

    return {
      firstName: nameParts[0] || undefined,
      lastName: nameParts.slice(1).join(' ') || undefined,
      addressLine1: document.clientAddress || undefined,
      city: document.clientCity || undefined,
      postalCode: document.clientPostalCode || undefined,
      countryCode,
    };
  }

  async getPublicPaymentByToken(accessToken: string) {
    const publicAccess =
      await this.prismaService.invoicePublicAccess.findUnique({
        where: { accessToken: accessToken },
        include: {
          invoice: {
            include: {
              services: true,
              company: {
                select: {
                  name: true,
                  email: true,
                  address: true,
                  postalCode: true,
                  city: true,
                  country: true,
                },
              },
            },
          },
          invoicePaymentLink: true,
        },
      });

    if (!publicAccess || publicAccess.expiresAt < new Date()) {
      throw new BadRequestException(
        'Ce lien de paiement est invalide ou expiré.',
      );
    }

    return {
      paymentLink: publicAccess.invoicePaymentLink.url,
      expiresAt: publicAccess.expiresAt,
      document: publicAccess.invoice,
    };
  }

  private async getInvoiceCompany(companyId: string) {
    const company = await this.prismaService.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        siren: true,
        address: true,
        postalCode: true,
        city: true,
        country: true,
        vatNumber: true,
        IBAN: true,
        BIC: true,
      },
    });

    if (!company) {
      throw new BadRequestException(
        'Entreprise introuvable pour cette facture.',
      );
    }

    return company;
  }

  private createInvoiceAttachment(
    documentId: string,
    documentNumber: string | null,
    content: Buffer,
  ) {
    const safeNumber =
      documentNumber?.replace(/[^a-zA-Z0-9]/g, '') ?? documentId;

    return {
      filename: `facture-${safeNumber}.pdf`,
      content,
      contentType: 'application/pdf',
    };
  }

  private async markDocumentAsDelivered(
    documentId: string,
    isInvoice: boolean,
  ) {
    const data = isInvoice
      ? { invoiceStatus: 'PENDING' as const, sentAt: new Date() }
      : { estimateStatus: 'SENT' as const };

    await this.prismaService.document.update({
      where: { id: documentId },
      data,
    });
  }

  async manuallyMarkInvoiceAsPaid(
    documentId: string,
    user: User,
    paymentMethod: $Enums.PaymentMethod,
  ) {
    try {
      const activeCompanyId = await this.getActiveCompanyId(user, true);
      const isCompanyUser = await this.isCompanyUser(user.id, activeCompanyId);

      if (!isCompanyUser) {
        throw new BadRequestException(
          "Vous n'avez pas la permission de marquer cette facture comme payée.",
        );
      }

      const document = await this.prismaService.document.findUnique({
        where: { id: documentId },
        select: { type: true, invoiceStatus: true },
      });

      if (!document) {
        throw new BadRequestException('Document introuvable.');
      }

      const canBeMarkedAsPaid = document.invoiceStatus === 'PENDING';

      if (!canBeMarkedAsPaid) {
        throw new BadRequestException(
          'Seule une facture en attente peut être marquée comme payée manuellement.',
        );
      }

      await this.manuallyMarkInvoiceAs(
        'PAID_MANUALLY',
        documentId,
        paymentMethod,
      );

      return {
        success: true,
        message:
          'La facture a été marquée comme payée manuellement avec succès.',
      };
    } catch (error: unknown) {
      console.error('Error marking invoice as paid:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Une erreur est survenue lors de la mise à jour du statut de la facture.',
      );
    }
  }

  async manuallyMarkInvoiceAsPending(documentId: string, user: User) {
    try {
      const activeCompanyId = await this.getActiveCompanyId(user, true);
      const isCompanyUser = await this.isCompanyUser(user.id, activeCompanyId);

      if (!isCompanyUser) {
        throw new BadRequestException(
          "Vous n'avez pas la permission de marquer cette facture comme en attente.",
        );
      }

      const document = await this.prismaService.document.findUnique({
        where: { id: documentId },
        select: { type: true, invoiceStatus: true },
      });

      if (!document) {
        throw new BadRequestException('Document introuvable.');
      }

      if (document.invoiceStatus === 'PENDING') {
        throw new BadRequestException(
          'La facture est déjà marquée comme en attente.',
        );
      }

      const canBeMarkedAsPending = document.invoiceStatus === 'PAID_MANUALLY';

      if (!canBeMarkedAsPending) {
        throw new BadRequestException(
          'Seule une facture qui a été manuellement marquée comme payée peut être marquée comme en attente.',
        );
      }

      await this.manuallyMarkInvoiceAs('PENDING', documentId);

      return {
        success: true,
        message: 'La facture a été marquée comme étant en attente avec succès.',
      };
    } catch (error: unknown) {
      console.error('Error marking invoice as pending:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Une erreur est survenue lors de la mise à jour du statut de la facture.',
      );
    }
  }

  private async manuallyMarkInvoiceAs(
    status: $Enums.InvoiceStatus,
    documentId: string,
    paymentMethod?: $Enums.PaymentMethod,
  ) {
    try {
      await this.prismaService.$transaction(async (prisma) => {
        const document = await prisma.document.findUnique({
          where: { id: documentId },
          select: { type: true, invoiceStatus: true, companyId: true },
        });

        if (!document) {
          throw new BadRequestException('Document introuvable.');
        }

        if (document.type !== 'INVOICE') {
          throw new BadRequestException(
            'Seule une facture peut être marquée avec un statut de paiement.',
          );
        }

        if (document.invoiceStatus === status) {
          throw new BadRequestException(
            `La facture est déjà marquée comme ${status}.`,
          );
        }

        await prisma.document.update({
          where: { id: documentId },
          data: { invoiceStatus: status },
        });

        if (status === 'PAID_MANUALLY') {
          await this.invoicePaymentFeeService.createForPaidInvoice(
            documentId,
            document.companyId,
            prisma,
            paymentMethod,
          );
        }

        if (status === 'PENDING') {
          await this.invoicePaymentFeeService.resetForPendingInvoice(
            documentId,
            prisma,
          );
        }
      });
    } catch (error: unknown) {
      console.error('Error manually marking invoice as:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Une erreur est survenue lors de la mise à jour du statut de la facture.',
      );
    }
  }
}
