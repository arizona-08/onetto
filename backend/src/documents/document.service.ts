import { BadRequestException, HttpException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateDocumentDto } from "./dtos/create-document.dto";
import { User } from "src/types/extended-request.types";
import { randomBytes } from "crypto";
import { MailService } from "src/mail/mail.service";

@Injectable()
export class DocumentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService
  ) {}

  async createDocument(data: CreateDocumentDto, user: User) {
    try {
      const {lineItems, ...documentData} = data;
      const companyId = await this.getActiveCompanyId(user, true);
      const documentNumber = await this.createDocumentNumber("ESTIMATE", companyId);

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

      const document = await this.prismaService.document.create({
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
          estimateStatus: "DRAFT",
          invoiceStatus: "DRAFT",
          companyId,
          paymentDueAt: new Date(data.documentDates.dueDate),
        }
      });


      await this.prismaService.$transaction(async (prisma) => {
        for (const lineItem of lineItems) {
          const wtPrice = lineItem.unitPrice * lineItem.quantity;
          const totalPrice = wtPrice + (lineItem.taxRate ? (wtPrice * lineItem.taxRate / 100) : 0);
          await prisma.documentService.create({
            data: {
              description: lineItem.description,
              quantity: lineItem.quantity,
              taxRate: lineItem.taxRate,
              unitPrice: lineItem.unitPrice,
              unit: lineItem.unit,
              documentId: document.id,
              wtPrice,
              totalPrice
            }
          });
        }
      });

      return {
        message: "Facture créée avec succès.",
        document
      };
    } catch (error: unknown) {

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Une erreur est survenue lors de la création de la facture.");
    }
    
  }

  async updateDraftDocument(documentId: string, data: CreateDocumentDto, user: User) {
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
        throw new BadRequestException("Document introuvable ou vous n'avez pas la permission d'y accéder.");
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
      const existingServiceIds = new Set(document.services.map((service) => service.id));
      const submittedServiceIds = lineItems
        .map((lineItem) => lineItem.id)
        .filter((serviceId): serviceId is string => Boolean(serviceId));

      if (new Set(submittedServiceIds).size !== submittedServiceIds.length) {
        throw new BadRequestException("Une ligne de service ne peut être envoyée qu'une seule fois.");
      }

      if (submittedServiceIds.some((serviceId) => !existingServiceIds.has(serviceId))) {
        throw new BadRequestException("Une ou plusieurs lignes de service sont introuvables.");
      }

      const serviceIdsToDelete = document.services
        .filter((service) => !submittedServiceIds.includes(service.id))
        .map((service) => service.id);

      const updatedDocument = await this.prismaService.$transaction(async (prisma) => {
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
          const totalPrice = wtPrice + (lineItem.taxRate ? (wtPrice * lineItem.taxRate / 100) : 0);
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

        return updatedDocument;
      });

      return {
        message: "Document mis à jour avec succès.",
        document: updatedDocument,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Une erreur est survenue lors de la mise à jour du document.");
    }
  }

  async convertEstimateToInvoice(documentId: string, user: User) {
    try {
      const companyId = await this.getActiveCompanyId(user, true);
      const document = await this.prismaService.document.findFirst({
        where: {
          id: documentId,
          companyId,
          type: "ESTIMATE"
        },
        include: {
          services: true
        }
      });

      if (!document) {
        throw new BadRequestException("Devis introuvable ou vous n'avez pas la permission d'y accéder.");
      }

      const invoiceNumber = await this.createDocumentNumber("INVOICE", companyId);

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
          type: "INVOICE",
          estimateStatus: "ACCEPTED",
          invoiceStatus: "DRAFT",
          companyId,
          createdAt: new Date(),
          paymentDueAt: document.paymentDueAt,
        }
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
              totalPrice: service.totalPrice
            }
          });
        }
      });

      return {
        message: "Devis converti en facture avec succès.",
        invoice
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("Une erreur est survenue lors de la conversion du devis en facture.");
    }
  }

  // chercher en fonction l'utilisateur connecté
  async createDocumentNumber(type: "ESTIMATE" | "INVOICE" , companyId: string): Promise<string>{
    const currentYear = new Date().getFullYear();
    const lastDocument = await this.prismaService.document.findFirst({
      where: { companyId, type },
      orderBy: { createdAt: 'desc' },
    });

    let lastDocumentNumber = 0;
    if(lastDocument){
      const lastDocumentNumberParts = lastDocument.documentNumber?.split('-');
      if(lastDocumentNumberParts && lastDocumentNumberParts.length === 3 && lastDocumentNumberParts[1] === currentYear.toString()){
        lastDocumentNumber = parseInt(lastDocumentNumberParts[2], 10);
      }
    }

    const newDocumentNumber = lastDocumentNumber + 1;
    const prefix = type === "ESTIMATE" ? "DEV" : "FACT";
    return `#${prefix}-${currentYear}-${newDocumentNumber.toString().padStart(4, '0')}`;
  }

  async getDocumentsByUser(user: User, withServices: boolean = true){
    try {
      const companyId = await this.getActiveCompanyId(user);
      const documents = await this.prismaService.document.findMany({
        where: {
          companyId
        }, 
        include: {
          services: withServices
        }
      });

      return {
        estimates: documents.filter(doc => doc.type === "ESTIMATE"),
        invoices: documents.filter(doc => doc.type === "INVOICE")
      };
    } catch (error: any) {
      console.error("Error fetching Documents by user:", error);
      throw new InternalServerErrorException("Une erreur est survenue lors de la récupération des factures de l'utilisateur.");
    }
  }

  async getDocumentById(documentId: string, user: User, withServices: boolean = true){
    try {
      const companyId = await this.getActiveCompanyId(user);
      const document = await this.prismaService.document.findFirst({
        where: {
          id: documentId,
          companyId
        },
        include: {
          services: withServices
        }
      });

      if(!document){
        throw new BadRequestException("Document introuvable ou vous n'avez pas la permission d'y accéder.");
      }

      return document;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Error fetching document by ID:", error);
      throw new InternalServerErrorException("Une erreur est survenue lors de la récupération du document.");
    }
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
        where: { negociationToken, status: 'PENDING' },
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

  async setNegociationStatus(negociationToken: string, status: 'ACCEPTED' | 'REJECTED') {
    const result = await this.prismaService.$transaction(async (prisma) => {
      const negociation = await prisma.estimateNegociation.findFirst({
        where: { negociationToken, status: 'PENDING' },
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

  private async getActiveCompanyId(user: User, requireActive = false): Promise<string> {
    if (!user.lastConnectedCompanyId) {
      throw new BadRequestException("Sélectionnez une entreprise avant de gérer des factures.");
    }

    if (requireActive) {
      const company = await this.prismaService.company.findUnique({
        where: { id: user.lastConnectedCompanyId },
        select: { status: true },
      });

      if (!company || company.status === "CLOSED") {
        throw new BadRequestException("Une entreprise fermée ne peut pas créer de factures.");
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
          companyId
        }
      });

      if (deleteResult.count === 0) {
        throw new BadRequestException("Aucun document supprimé. Vérifiez les IDs fournis.");
      }

      return {
        success: true,
        message: `${deleteResult.count} document(s) supprimé(s) avec succès.` // dire que la suppssion inclu aussi les différentes versions des documents
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Error deleting documents:", error);
      throw new InternalServerErrorException("Une erreur est survenue lors de la suppression des documents.");
    }
  }

  async sendDocumentToClient(documentId: string, user: User) {
    try {
      
      const document = await this.getDocumentById(documentId, user, true);

      if (!document) {
        throw new BadRequestException("Document introuvable ou vous n'avez pas la permission d'y accéder.");
      }

      const canSend = await this.isCompanyUser(user.id, document.companyId);
      if (!canSend) {
        throw new BadRequestException("Vous n'avez pas la permission d'envoyer ce document.");
      }

      const negociationToken = randomBytes(16).toString('hex');

      const negociation = await this.prismaService.estimateNegociation.create({
        data: {
          documentId: document.id,
          message: "",
          proposedTotalPrice: document.totalPrice,
          negociationToken
        }
      });

      const documentType = document.type === "INVOICE" ? "facture" : "devis";

      // different de mailerService.sendMail
      await this.mailService.sendMail({
        to: document.clientEmail,
        subject: `Votre ${documentType} ${document.documentNumber}`,
        text: `Bonjour ${document.clientName},\n\nVous avez reçu un nouveau ${documentType} de la part de ${user.firstname} ${user.lastname}.\n\nVous pouvez consulter le ${documentType} en cliquant sur le lien suivant :\n\n${process.env.FRONTEND_URL}/negociations?token=${negociation.negociationToken}\n\nMerci.`
      })

      if (document.type === 'ESTIMATE') {
        await this.prismaService.document.update({
          where: { id: document.id },
          data: { estimateStatus: 'SENT' },
        });
      }

      return {
        success: true,
        message: "Document envoyé au client avec succès."
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Error sending document to client:", error);
      throw new InternalServerErrorException("Une erreur est survenue lors de l'envoi du document au client.");
    }
  }

  async isCompanyUser(userId: string, companyId: string): Promise<boolean> {
    const companyUser = await this.prismaService.companyUser.findFirst({
      where: {
        userId,
        companyId
      }
    });

    return !!companyUser;
  }
}
