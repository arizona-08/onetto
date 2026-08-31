import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDocumentDto } from './dtos/create-document.dto';
import { SendDocumentToClientDto } from './dtos/send-document-to-client.dto';
import { REMINDER_RULES, User } from 'src/types/extended-request.types';
import { randomBytes } from 'crypto';
import { MailService } from 'src/mail/mail.service';
import { $Enums, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CreatePaymentLinkInput } from 'src/Adapters/PaymentAdapters/Types/InputTypes/CreatePaymentLinkInput.types';
import { PaymentService } from 'src/Adapters/PaymentAdapters/payment.service';
import { PdfService } from 'src/pdf/pdf.service';
import { PlanAccessService } from 'src/plan-access/plan-access.service';
import { GoCardlessInstalmentRetryService } from 'src/Adapters/PaymentAdapters/gocardless/gocardless-instalment-retry.service';
import {
  buildInstalmentSchedule,
  parseDateOnly,
} from './instalment-plan.utils';
import { FacturXService } from 'src/electronic-invoicing/factur-x.service';
import { SuperPdpEreportingService } from 'src/electronic-invoicing/superpdp-ereporting.service';
import { SuperPdpB2bService } from 'src/electronic-invoicing/superpdp-b2b.service';

@Injectable()
export class DocumentService {
  callbackUrl: string;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    private readonly pdfService: PdfService,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
    private readonly planAccessService: PlanAccessService,
    private readonly gocardlessInstalmentRetryService: GoCardlessInstalmentRetryService,
    private readonly facturXService: FacturXService,
    private readonly superPdpEreportingService: SuperPdpEreportingService,
    private readonly superPdpB2bService: SuperPdpB2bService,
  ) {
    this.callbackUrl =
      this.configService.get<string>('BRIDGE_CALLBACK_URL') || '';
  }

  async createDocument(data: CreateDocumentDto, user: User) {
    try {
      const { lineItems, type = 'ESTIMATE', ...documentData } = data;
      const companyId = await this.getActiveCompanyId(user, true);
      if (data.instalmentsDetails) {
        await this.planAccessService.assertFeatureAvailable(
          companyId,
          'instalments',
        );
      }
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
            clientType:
              documentData.client.clientType === 'BUSINESS'
                ? 'BUSINESS'
                : 'INDIVIDUAL',
            clientSiren: documentData.client.siren,
            clientVatNumber: documentData.client.vatNumber,
            clientElectronicAddress: documentData.client.electronicAddress,
            clientElectronicAddressScheme: documentData.client.electronicAddressScheme,
            operationNature: this.getOperationNatureFromLineItems(lineItems),
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
              itemType: lineItem.itemType ?? 'SERVICES',
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

        const updatedDocument = await this.prismaService.$transaction(
          async (prisma) => {
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
          },
        );

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
              clientType:
                documentData.client.clientType === 'BUSINESS'
                  ? 'BUSINESS'
                  : 'INDIVIDUAL',
              clientSiren: documentData.client.siren,
              clientVatNumber: documentData.client.vatNumber,
              clientElectronicAddress: documentData.client.electronicAddress,
              clientElectronicAddressScheme:
                documentData.client.electronicAddressScheme,
              operationNature: this.getOperationNatureFromLineItems(lineItems),
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
              itemType: lineItem.itemType ?? 'SERVICES',
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
    invoice: {
      id: string;
      companyId: string;
      totalPrice: number;
      createdAt: Date;
    },
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

    await this.planAccessService.assertFeatureAvailable(
      invoice.companyId,
      'instalments',
    );

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
    const authorizationDeadline = new Date(
      firstDueDate.getTime() -
        REMINDER_RULES.INSTALMENT_AUTHORIZATION_LEAD_DAYS * 24 * 60 * 60 * 1000,
    );
    if (
      Number.isNaN(firstDueDate.getTime()) ||
      authorizationDeadline < issueDate
    ) {
      throw new BadRequestException(
        "La première échéance doit laisser le temps nécessaire à l'autorisation du prélèvement.",
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
        authorizationDeadline,
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
          clientType: document.clientType,
          clientSiren: document.clientSiren,
          clientVatNumber: document.clientVatNumber,
          clientElectronicAddress: document.clientElectronicAddress,
          clientElectronicAddressScheme:
            document.clientElectronicAddressScheme,
          operationNature: document.operationNature,
          clientIsVatTaxable: document.clientIsVatTaxable,
          clientForeignIdentifier: document.clientForeignIdentifier,
          deliveryAddress: document.deliveryAddress,
          deliveryCity: document.deliveryCity,
          deliveryPostalCode: document.deliveryPostalCode,
          deliveryCountry: document.deliveryCountry,
          currencyCode: document.currencyCode,
          isVatExempt: document.isVatExempt,
          vatExemptionReason: document.vatExemptionReason,
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
              itemType: service.itemType,
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
                invoicePaymentInstalments: {
                  orderBy: { instalmentNumber: 'asc' },
                },
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
              invoicePaymentInstalments: {
                orderBy: { instalmentNumber: 'asc' },
              },
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

  async getDashboardSummary(user: User) {
    const companyId = await this.getActiveCompanyId(user);
    const [
      invoices,
      pendingEstimates,
      recentInvoices,
      recentActivity,
      estimates,
      reminderInvoices,
      monthlyInvoices,
    ] = await Promise.all([
      this.prismaService.document.findMany({
        where: { companyId, type: 'INVOICE' },
        select: { totalPrice: true, invoiceStatus: true },
      }),
      this.prismaService.document.count({
        where: { companyId, type: 'ESTIMATE', estimateStatus: 'SENT' },
      }),
      this.prismaService.document.findMany({
        where: { companyId, type: 'INVOICE' },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          documentNumber: true,
          totalPrice: true,
          invoiceStatus: true,
          createdAt: true,
        },
      }),
      this.prismaService.document.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          type: true,
          documentNumber: true,
          invoiceStatus: true,
          estimateStatus: true,
          createdAt: true,
        },
      }),
      this.prismaService.document.findMany({
        where: { companyId, type: 'ESTIMATE', isLastVersion: true },
        select: { estimateStatus: true },
      }),
      this.prismaService.document.findMany({
        where: {
          companyId,
          type: 'INVOICE',
          invoiceStatus: { in: ['PENDING', 'OVERDUE', 'PAYMENT_IN_PROGRESS'] },
        },
        orderBy: { paymentDueAt: 'asc' },
        take: 3,
        select: {
          id: true,
          documentNumber: true,
          invoiceStatus: true,
          paymentDueAt: true,
        },
      }),
      this.prismaService.document.findMany({
        where: {
          companyId,
          type: 'INVOICE',
          invoiceStatus: { not: 'DRAFT' },
          createdAt: {
            gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth() - 5,
              1,
            ),
          },
        },
        select: { totalPrice: true, createdAt: true },
      }),
    ]);

    const pendingEstimateList = await this.prismaService.document.findMany({
      where: { companyId, type: 'ESTIMATE', estimateStatus: 'SENT' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        documentNumber: true,
        totalPrice: true,
        createdAt: true,
      },
    });

    const collectedStatuses = new Set(['PAID', 'PAID_MANUALLY']);
    const outstandingStatuses = new Set([
      'PENDING',
      'PAYMENT_IN_PROGRESS',
      'PARTIALLY_PAID',
      'OVERDUE',
      'REJECTED',
    ]);
    const billed = invoices.filter(
      (invoice) => invoice.invoiceStatus !== 'DRAFT',
    );
    const collected = invoices.filter((invoice) =>
      collectedStatuses.has(invoice.invoiceStatus),
    );
    const outstanding = invoices.filter((invoice) =>
      outstandingStatuses.has(invoice.invoiceStatus),
    );

    const now = new Date();
    const revenueByMonth = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      return {
        key,
        label: date.toLocaleDateString('fr-FR', { month: 'short' }),
        amount: 0,
      };
    });
    for (const invoice of monthlyInvoices) {
      const key = `${invoice.createdAt.getFullYear()}-${invoice.createdAt.getMonth()}`;
      const month = revenueByMonth.find((item) => item.key === key);
      if (month) month.amount += invoice.totalPrice;
    }

    const estimatesSent = estimates.filter(
      (estimate) => estimate.estimateStatus === 'SENT',
    ).length;
    const estimatesAccepted = estimates.filter(
      (estimate) => estimate.estimateStatus === 'ACCEPTED',
    ).length;
    const estimatesNegotiating = estimates.filter(
      (estimate) => estimate.estimateStatus === 'SUPERSEDED',
    ).length;
    const estimatesRejected = estimates.filter(
      (estimate) => estimate.estimateStatus === 'REJECTED',
    ).length;

    return {
      billedAmount: billed.reduce(
        (total, invoice) => total + invoice.totalPrice,
        0,
      ),
      collectedAmount: collected.reduce(
        (total, invoice) => total + invoice.totalPrice,
        0,
      ),
      outstandingAmount: outstanding.reduce(
        (total, invoice) => total + invoice.totalPrice,
        0,
      ),
      pendingInvoicesCount: invoices.filter(
        (invoice) => invoice.invoiceStatus === 'PENDING',
      ).length,
      overdueInvoicesCount: invoices.filter(
        (invoice) => invoice.invoiceStatus === 'OVERDUE',
      ).length,
      pendingEstimatesCount: pendingEstimates,
      recentInvoices,
      pendingEstimates: pendingEstimateList,
      recentActivity,
      starter: {
        revenueByMonth: revenueByMonth.map(({ label, amount }) => ({
          label,
          amount,
        })),
        commercialPerformance: {
          sent: estimatesSent,
          accepted: estimatesAccepted,
          negotiating: estimatesNegotiating,
          rejected: estimatesRejected,
          acceptanceRate:
            estimates.length === 0
              ? 0
              : Math.round((estimatesAccepted / estimates.length) * 100),
        },
        reminders: reminderInvoices,
      },
    };
  }

  async getAdvancedDashboard(user: User) {
    const companyId = await this.getActiveCompanyId(user);
    await this.planAccessService.assertFeatureAvailable(
      companyId,
      'advancedAnalytics',
    );

    const [invoices, estimates] = await Promise.all([
      this.prismaService.document.findMany({
        where: { companyId, type: 'INVOICE', invoiceStatus: { not: 'DRAFT' } },
        select: { totalPrice: true, invoiceStatus: true },
      }),
      this.prismaService.document.findMany({
        where: { companyId, type: 'ESTIMATE', isLastVersion: true },
        select: { estimateStatus: true },
      }),
    ]);

    const paidInvoices = invoices.filter((invoice) =>
      ['PAID', 'PAID_MANUALLY'].includes(invoice.invoiceStatus),
    );
    const acceptedEstimates = estimates.filter(
      (estimate) => estimate.estimateStatus === 'ACCEPTED',
    );

    return {
      averageInvoiceAmount:
        invoices.length === 0
          ? 0
          : invoices.reduce((total, invoice) => total + invoice.totalPrice, 0) /
            invoices.length,
      estimateAcceptanceRate:
        estimates.length === 0
          ? 0
          : acceptedEstimates.length / estimates.length,
      paidInvoicesCount: paidInvoices.length,
      invoicesCount: invoices.length,
    };
  }

  async getProDashboard(user: User) {
    const companyId = await this.getActiveCompanyId(user);
    await this.planAccessService.assertFeatureAvailable(
      companyId,
      'advancedAnalytics',
    );

    const since = new Date(
      new Date().getFullYear(),
      new Date().getMonth() - 5,
      1,
    );
    const [invoices, estimates] = await Promise.all([
      this.prismaService.document.findMany({
        where: { companyId, type: 'INVOICE', invoiceStatus: { not: 'DRAFT' } },
        select: {
          id: true,
          clientName: true,
          totalPrice: true,
          createdAt: true,
          paymentDueAt: true,
          invoiceStatus: true,
          sourceDocumentId: true,
          payByBankPayments: {
            select: { amountInCents: true, status: true, updatedAt: true },
          },
          invoiceInstalmentPlan: {
            select: {
              invoicePaymentInstalments: {
                select: {
                  amountInCents: true,
                  dueDate: true,
                  paidAt: true,
                  instalmentStatus: true,
                },
              },
            },
          },
        },
      }),
      this.prismaService.document.findMany({
        where: { companyId, type: 'ESTIMATE' },
        select: { estimateStatus: true },
      }),
    ]);

    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(
        new Date().getFullYear(),
        new Date().getMonth() - 5 + index,
        1,
      );
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString('fr-FR', { month: 'short' }),
        billed: 0,
        collected: 0,
      };
    });
    const byKey = new Map(months.map((month) => [month.key, month]));
    const clientTotals = new Map<string, number>();
    let payByBankAmount = 0;
    let instalmentAmount = 0;
    let twoInstalments = 0;
    let threePlusInstalments = 0;
    let paymentDelayDaysTotal = 0;
    let paymentDelayCount = 0;
    let upcomingInstalments = 0;
    let overdueInstalments = 0;
    const now = new Date();
    const forecast = new Map<string, number>();

    for (const invoice of invoices) {
      const month = byKey.get(
        `${invoice.createdAt.getFullYear()}-${invoice.createdAt.getMonth()}`,
      );
      if (month && invoice.createdAt >= since)
        month.billed += invoice.totalPrice;
      const paidPayments = invoice.payByBankPayments.filter(
        (payment) => payment.status === 'SUCCESS',
      );
      const paidInstalments =
        invoice.invoiceInstalmentPlan?.invoicePaymentInstalments.filter(
          (item) => item.instalmentStatus === 'SUCCESS',
        ) ?? [];
      const collectedAmount =
        paidPayments.reduce(
          (sum, payment) => sum + payment.amountInCents / 100,
          0,
        ) +
        paidInstalments.reduce(
          (sum, item) => sum + item.amountInCents / 100,
          0,
        );
      const paidDate = [
        ...paidPayments.map((payment) => payment.updatedAt),
        ...paidInstalments.flatMap((item) =>
          item.paidAt ? [item.paidAt] : [],
        ),
      ].sort((a, b) => b.getTime() - a.getTime())[0];
      if (paidDate) {
        const collectedMonth = byKey.get(
          `${paidDate.getFullYear()}-${paidDate.getMonth()}`,
        );
        if (collectedMonth && paidDate >= since)
          collectedMonth.collected += collectedAmount;
        paymentDelayDaysTotal += Math.max(
          0,
          Math.round(
            (paidDate.getTime() - invoice.createdAt.getTime()) / 86_400_000,
          ),
        );
        paymentDelayCount += 1;
      }
      if (['PAID', 'PAID_MANUALLY'].includes(invoice.invoiceStatus))
        clientTotals.set(
          invoice.clientName,
          (clientTotals.get(invoice.clientName) ?? 0) + invoice.totalPrice,
        );
      if (invoice.invoiceInstalmentPlan) {
        instalmentAmount += invoice.totalPrice;
        const count =
          invoice.invoiceInstalmentPlan.invoicePaymentInstalments.length;
        if (count === 2) twoInstalments += 1;
        if (count >= 3) threePlusInstalments += 1;
        for (const instalment of invoice.invoiceInstalmentPlan
          .invoicePaymentInstalments) {
          if (instalment.instalmentStatus === 'SUCCESS') continue;
          if (instalment.dueDate < now) overdueInstalments += 1;
          else upcomingInstalments += 1;
          const key = `${instalment.dueDate.getFullYear()}-${String(instalment.dueDate.getMonth() + 1).padStart(2, '0')}`;
          forecast.set(
            key,
            (forecast.get(key) ?? 0) + instalment.amountInCents / 100,
          );
        }
      } else {
        payByBankAmount += invoice.totalPrice;
        if (!['PAID', 'PAID_MANUALLY'].includes(invoice.invoiceStatus)) {
          const key = `${invoice.paymentDueAt.getFullYear()}-${String(invoice.paymentDueAt.getMonth() + 1).padStart(2, '0')}`;
          forecast.set(key, (forecast.get(key) ?? 0) + invoice.totalPrice);
        }
      }
    }

    const acceptedEstimates = estimates.filter(
      (estimate) => estimate.estimateStatus === 'ACCEPTED',
    ).length;
    const convertedInvoices = invoices.filter(
      (invoice) => invoice.sourceDocumentId !== null,
    ).length;
    const totalPaymentAmount = payByBankAmount + instalmentAmount;

    return {
      revenueByMonth: months.map(({ label, billed, collected }) => ({
        label,
        billed,
        collected,
      })),
      cashflowForecast: [...forecast.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(0, 3)
        .map(([month, amount]) => ({
          month: new Date(`${month}-01T00:00:00`).toLocaleDateString('fr-FR', {
            month: 'long',
          }),
          amount,
        })),
      paymentDistribution: {
        payByBankPercent: totalPaymentAmount
          ? Math.round((payByBankAmount / totalPaymentAmount) * 100)
          : 0,
        instalmentsPercent: totalPaymentAmount
          ? Math.round((instalmentAmount / totalPaymentAmount) * 100)
          : 0,
        twoInstalments,
        threePlusInstalments,
      },
      performance: {
        acceptanceRate: estimates.length
          ? Math.round((acceptedEstimates / estimates.length) * 100)
          : 0,
        invoiceConversionRate: acceptedEstimates
          ? Math.round((convertedInvoices / acceptedEstimates) * 100)
          : 0,
        averageInvoiceAmount: invoices.length
          ? Math.round(
              invoices.reduce((sum, invoice) => sum + invoice.totalPrice, 0) /
                invoices.length,
            )
          : 0,
      },
      payments: {
        averageDelayDays: paymentDelayCount
          ? Math.round(paymentDelayDaysTotal / paymentDelayCount)
          : null,
        upcomingInstalments,
        overdueInstalments,
      },
      topClients: [...clientTotals.entries()]
        .sort(([, left], [, right]) => right - left)
        .slice(0, 3)
        .map(([name, amount]) => ({ name, amount })),
      alerts: {
        overdueInvoices: invoices.filter(
          (invoice) => invoice.invoiceStatus === 'OVERDUE',
        ).length,
        overdueInstalments,
        unansweredEstimates: estimates.filter(
          (estimate) => estimate.estimateStatus === 'SENT',
        ).length,
      },
    };
  }

  async getCashflowForecast(user: User) {
    const companyId = await this.getActiveCompanyId(user);
    await this.planAccessService.assertFeatureAvailable(
      companyId,
      'cashflowForecast',
    );

    const invoices = await this.prismaService.document.findMany({
      where: {
        companyId,
        type: 'INVOICE',
        invoiceStatus: {
          in: ['PENDING', 'PAYMENT_IN_PROGRESS', 'PARTIALLY_PAID', 'OVERDUE'],
        },
      },
      select: {
        totalPrice: true,
        paymentDueAt: true,
        invoiceInstalmentPlan: {
          select: {
            invoicePaymentInstalments: {
              where: { instalmentStatus: { not: 'SUCCESS' } },
              select: { amountInCents: true, dueDate: true },
            },
          },
        },
      },
    });

    const forecast = new Map<string, number>();
    for (const invoice of invoices) {
      const instalments =
        invoice.invoiceInstalmentPlan?.invoicePaymentInstalments ?? [];
      const entries = instalments.length
        ? instalments.map((instalment) => ({
            amountInCents: instalment.amountInCents,
            dueDate: instalment.dueDate,
          }))
        : [
            {
              amountInCents: Math.round(invoice.totalPrice * 100),
              dueDate: invoice.paymentDueAt,
            },
          ];

      for (const entry of entries) {
        const key = `${entry.dueDate.getUTCFullYear()}-${String(entry.dueDate.getUTCMonth() + 1).padStart(2, '0')}`;
        forecast.set(key, (forecast.get(key) ?? 0) + entry.amountInCents);
      }
    }

    return [...forecast.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, amountInCents]) => ({ month, amountInCents }));
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
          electronicInvoiceTransmissions: {
            where: { provider: 'SUPER_PDP', flow: 'B2B_FR' },
            select: {
              status: true,
              providerStatus: true,
              providerInvoiceId: true,
              submittedAt: true,
              lastSyncedAt: true,
              lastError: true,
            },
          },
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
    const negociation = await this.prismaService.estimateNegociation.findUnique(
      {
        where: { negociationToken },
        select: {
          id: true,
          message: true,
          proposedTotalPrice: true,
          status: true,
          document: {
            select: {
              id: true,
              companyId: true,
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
      },
    );

    if (!negociation) return null;
    const access = await this.planAccessService.getCompanyAccess(
      negociation.document.companyId,
    );
    const { companyId: _companyId, ...document } = negociation.document;

    return {
      ...negociation,
      document,
      canNegotiate: access.features.negotiation,
    };
  }

  async renegociateByToken(negociationToken: string, message: string) {
    const pendingNegociation =
      await this.prismaService.estimateNegociation.findFirst({
        where: {
          negociationToken,
          status: 'PENDING',
          document: { type: 'ESTIMATE' },
        },
        select: { document: { select: { companyId: true } } },
      });
    if (!pendingNegociation) return null;

    await this.planAccessService.assertFeatureAvailable(
      pendingNegociation.document.companyId,
      'negotiation',
    );

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
          clientType: sourceDocument.clientType,
          clientSiren: sourceDocument.clientSiren,
          clientVatNumber: sourceDocument.clientVatNumber,
          clientElectronicAddress: sourceDocument.clientElectronicAddress,
          clientElectronicAddressScheme:
            sourceDocument.clientElectronicAddressScheme,
          operationNature: sourceDocument.operationNature,
          clientIsVatTaxable: sourceDocument.clientIsVatTaxable,
          clientForeignIdentifier: sourceDocument.clientForeignIdentifier,
          deliveryAddress: sourceDocument.deliveryAddress,
          deliveryCity: sourceDocument.deliveryCity,
          deliveryPostalCode: sourceDocument.deliveryPostalCode,
          deliveryCountry: sourceDocument.deliveryCountry,
          currencyCode: sourceDocument.currencyCode,
          isVatExempt: sourceDocument.isVatExempt,
          vatExemptionReason: sourceDocument.vatExemptionReason,
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
          itemType: service.itemType,
          taxRate: service.taxRate,
          wtPrice: service.wtPrice,
          totalPrice: service.totalPrice,
        })),
      });

      return { document };
    });
  }

  private getOperationNatureFromLineItems(
    lineItems: Array<{ itemType?: 'GOODS' | 'SERVICES' }>,
  ): 'GOODS' | 'SERVICES' | 'MIXED' {
    const itemTypes = new Set(lineItems.map((lineItem) => lineItem.itemType ?? 'SERVICES'));
    if (itemTypes.has('GOODS') && itemTypes.has('SERVICES')) return 'MIXED';
    return itemTypes.has('GOODS') ? 'GOODS' : 'SERVICES';
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

    const isCompanyUser = await this.isCompanyUser(
      user.id,
      user.lastConnectedCompanyId,
    );
    if (!isCompanyUser) {
      throw new BadRequestException(
        'Entreprise active introuvable ou accès non autorisé.',
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

  async deleteDraftDocument(documentId: string, user: User) {
    try {
      const companyId = await this.getActiveCompanyId(user);
      const deleteResult = await this.prismaService.document.deleteMany({
        where: {
          id: documentId,
          companyId,
          OR: [
            { type: 'ESTIMATE', estimateStatus: 'DRAFT' },
            { type: 'INVOICE', invoiceStatus: 'DRAFT' },
          ],
        },
      });

      if (deleteResult.count === 0) {
        throw new BadRequestException(
          'Seul un brouillon de votre entreprise active peut être supprimé.',
        );
      }

      return {
        success: true,
        message: 'Brouillon supprimé avec succès.',
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Une erreur est survenue lors de la suppression du brouillon.',
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

      if (isInvoice) {
        await this.facturXService.archive(document.id, user);
      }

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

      if (
        isInvoice &&
        document.clientType === 'INDIVIDUAL' &&
        ['FR', 'FRA', 'FRANCE'].includes(document.clientCountry.trim().toUpperCase()) &&
        this.configService.get<string>('SUPERPDP_TRANSACTION_EREPORTING_ENABLED') === 'true'
      ) {
        try {
          await this.superPdpEreportingService.submitB2CTransaction({
            companyId: document.companyId,
            documentId: document.id,
            userId: user.id,
          });
        } catch (error) {
          console.error('E-reporting B2C automatique impossible:', error);
        }
      }

      if (isInvoice && document.clientType === 'BUSINESS') {
        try {
          await this.superPdpB2bService.send({
            companyId: document.companyId,
            documentId: document.id,
            user,
          });
        } catch (error) {
          // The invoice email has already been sent. The B2B transmission
          // service persists a retryable FAILED status when it could start;
          // never turn a temporary platform issue into a failed client send.
          console.error('Transmission B2B SuperPDP automatique impossible:', error);
        }
      }

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

  async resendInstalmentMandateAuthorisation(documentId: string, user: User) {
    const document = await this.getDocumentById(documentId, user, true);
    if (document.type !== 'INVOICE') {
      throw new BadRequestException('Cette action est réservée aux factures.');
    }

    const { paymentMode, instalmentsDetails } =
      await this.getPaymentModeDetails(documentId);
    if (paymentMode !== 'INSTALMENTS') {
      throw new BadRequestException(
        'Cette facture ne comporte pas de paiement en plusieurs fois.',
      );
    }
    if (
      !(await this.gocardlessInstalmentRetryService.requiresMandateReauthorisation(
        documentId,
        user,
      ))
    ) {
      throw new BadRequestException(
        'Aucune nouvelle autorisation de mandat n’est requise pour cette facture.',
      );
    }

    const company = await this.getInvoiceCompany(document.companyId);
    const paymentLink = await this.createInvoicePaymentLink(
      paymentMode,
      document,
      company,
      user,
      instalmentsDetails,
    );
    const mailContent = this.mailService.createInstalmentMandateRenewalMail({
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
    });

    return {
      success: true,
      message: 'Une nouvelle autorisation de prélèvement a été envoyée au client.',
    };
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
    if (paymentMode === 'INSTALMENTS') {
      await this.planAccessService.assertFeatureAvailable(
        company.id,
        'instalments',
      );
    }
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
    const countryCode =
      country === 'FRANCE'
        ? 'FR'
        : /^[A-Z]{2}$/.test(country)
          ? country
          : undefined;

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
      : { estimateStatus: 'SENT' as const, sentAt: new Date() };

    await this.prismaService.document.update({
      where: { id: documentId },
      data,
    });
  }

  async manuallyMarkInvoiceAsPaid(documentId: string, user: User) {
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

      await this.manuallyMarkInvoiceAs('PAID_MANUALLY', documentId);
      await this.superPdpEreportingService.syncCollectedPaymentsForInvoice(documentId);

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
  ) {
    try {
      await this.prismaService.$transaction(async (prisma) => {
        const document = await prisma.document.findUnique({
          where: { id: documentId },
          select: { type: true, invoiceStatus: true },
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
