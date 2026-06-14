import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateInvoiceDto } from "./dtos/create-invoice.dto";

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prismaService: PrismaService
  ) {}

  async createInvoice(data: CreateInvoiceDto) {
    try {
      const {services, ...invoiceData} = data;
      const invoiceNumber = await this.createInvoiceNumber();

      const invoice = await this.prismaService.invoice.create({
        data: {
          ...invoiceData,
          invoiceNumber,
          status: "DRAFT",
          authorId: "CRAFTED_ID",
          createdAt: new Date(data.createdAt),
          paymentDueAt: new Date(data.paymentDueAt)
        }
      });

      await this.prismaService.$transaction(async (prisma) => {
        for (const service of services) {
          await prisma.invoiceService.create({
            data: {
              ...service,
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