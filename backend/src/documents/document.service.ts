import { BadRequestException, HttpException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateDocumentDto } from "./dtos/create-document.dto";
import { User } from "src/types/extended-request.types";

@Injectable()
export class DocumentService {
  constructor(
    private readonly prismaService: PrismaService
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
          clientAddress: documentData.client.street,
          clientCity: documentData.client.city,
          clientCountry: documentData.client.country,
          clientPostalCode: documentData.client.postalCode,
          totalPriceExcludingTax: totalPriceExludingTax,
          totalPrice: totalDocumentPrice,
          documentNumber,
          estimateStatus: "DRAFT",
          invoiceStatus: "DRAFT",
          companyId,
          createdAt: new Date(data.documentDates.creationDate),
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
    const prefix = type === "ESTIMATE" ? "EST" : "FACT";
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
}
