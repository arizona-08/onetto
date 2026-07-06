import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateInvoiceDto } from "./dtos/create-invoice.dto";
import { User } from "src/types/extended-request.types";

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prismaService: PrismaService
  ) {}

  async createInvoice(data: CreateInvoiceDto, user: User) {
    try {
      const {lineItems, ...invoiceData} = data;
      const invoiceNumber = await this.createInvoiceNumber();

      const totalPriceExludingTax = lineItems.reduce((acc, item) => {
        const basePrice = item.unitPrice * item.quantity;
        return acc + basePrice;
      }, 0);

      const totalVatAmount = lineItems.reduce((acc, item) => {
        const basePrice = item.unitPrice * item.quantity;
        const taxAmount = basePrice * ((item.taxRate ? item.taxRate : 0) / 100);
        return acc + taxAmount;
      }, 0);

      const totalInvoicePrice = totalPriceExludingTax + totalVatAmount;

      const invoice = await this.prismaService.invoice.create({
        data: {
          clientName: invoiceData.client.name,
          clientEmail: invoiceData.client.email,
          clientAddress: invoiceData.client.street,
          clientCity: invoiceData.client.city,
          clientCountry: invoiceData.client.country,
          clientPostalCode: invoiceData.client.postalCode,
          totalPriceExcludingTax: totalPriceExludingTax,
          totalPrice: totalInvoicePrice,
          invoiceNumber,
          status: "DRAFT",
          authorId: user.id,
          createdAt: new Date(data.invoiceDates.creationDate),
          paymentDueAt: new Date(data.invoiceDates.dueDate),
        }
      });


      await this.prismaService.$transaction(async (prisma) => {
        for (const lineItem of lineItems) {
          const wtPrice = lineItem.unitPrice * lineItem.quantity;
          const totalPrice = wtPrice + (lineItem.taxRate ? (wtPrice * lineItem.taxRate / 100) : 0);
          await prisma.invoiceService.create({
            data: {
              description: lineItem.description,
              quantity: lineItem.quantity,
              taxRate: lineItem.taxRate,
              unitPrice: lineItem.unitPrice,
              unit: lineItem.unit,
              invoiceId: invoice.id,
              wtPrice,
              totalPrice
            }
          });
        }
      });

      return {
        message: "Facture créée avec succès.",
        invoice
      };
    } catch (error: any) {
      throw new InternalServerErrorException("Une erreur est survenur lors de la création de la facture." + error.message);
    }
    
  }

  // chercher en fonction l'utilisateur connecté
  async createInvoiceNumber(): Promise<string>{
    const currentYear = new Date().getFullYear();
    const lastInvoice = await this.prismaService.invoice.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    let lastInvoiceNumber = 0;
    if(lastInvoice){
      const lastInvoiceNumberParts = lastInvoice.invoiceNumber.split('-');
      if(lastInvoiceNumberParts.length === 3 && lastInvoiceNumberParts[1] === currentYear.toString()){
        lastInvoiceNumber = parseInt(lastInvoiceNumberParts[2], 10);
      }
    }

    const newInvoiceNumber = lastInvoiceNumber + 1;
    return `#FACT-${currentYear}-${newInvoiceNumber.toString().padStart(4, '0')}`;
  }

  async getInvoicesByUser(userId: string, withServices: boolean = true){
    try {
      const invoices = await this.prismaService.invoice.findMany({
        where: {
          authorId: userId
        }, 
        include: {
          services: withServices
        }
      });

      return invoices;
    } catch (error: any) {
      console.error("Error fetching invoices by user:", error);
      throw new InternalServerErrorException("Une erreur est survenue lors de la récupération des factures de l'utilisateur.");
    }
  }

  async getInvoiceById(invoiceId: string, userId: string, withServices: boolean = true){
    try {
      const invoice = await this.prismaService.invoice.findFirst({
        where: {
          id: invoiceId,
          authorId: userId
        },
        include: {
          services: withServices
        }
      });

      if(!invoice){
        throw new BadRequestException("Facture introuvable ou vous n'avez pas la permission d'y accéder.");
      }

      return invoice;
    } catch (error: any) {
      console.error("Error fetching invoice by ID:", error);
      throw new InternalServerErrorException("Une erreur est survenue lors de la récupération de la facture.");
    }
  }
}