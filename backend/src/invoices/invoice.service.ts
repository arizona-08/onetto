import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateInvoiceDto } from "./dtos/create-invoice.dto";
import { User } from "src/types/extended-response.types";

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prismaService: PrismaService
  ) {}

  async createInvoice(data: CreateInvoiceDto, user: User) {
    try {
      const {lineItems, ...invoiceData} = data;
      const invoiceNumber = await this.createInvoiceNumber();

      const totalInvoicePrice = lineItems.reduce((acc, item) => acc + item.totalPrice, 0);

      const invoice = await this.prismaService.invoice.create({
        data: {
          clientName: invoiceData.client.name,
          clientEmail: invoiceData.client.email,
          clientAddress: invoiceData.client.street,
          clientCity: invoiceData.client.city,
          clientCountry: invoiceData.client.country,
          clientPostalCode: invoiceData.client.postalCode,
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
          await prisma.invoiceService.create({
            data: {
              ...lineItem,
              invoiceId: invoice.id
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
}