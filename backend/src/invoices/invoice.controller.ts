import { Body, Controller, Post } from "@nestjs/common";
import { InvoiceService } from "./invoice.service";
import { CreateInvoiceDto } from "./dtos/create-invoice.dto";

@Controller('api/invoices')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService
  ) {}

  @Post()
  async createInvoice(@Body() body: CreateInvoiceDto){
    return await this.invoiceService.createInvoice(body);
  }
}