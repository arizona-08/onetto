import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { InvoiceService } from "./invoice.service";
import { CreateInvoiceDto } from "./dtos/create-invoice.dto";
import type { ExtendedResponse, User } from "src/types/extended-response.types";
import { AuthGuard } from "src/auth/auth.guard";

@UseGuards(AuthGuard)
@Controller('api/invoices')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService
  ) {}

  @Post()
  async createInvoice(@Body() body: CreateInvoiceDto, @Req() req: ExtendedResponse){
    const user = req.user;
    return await this.invoiceService.createInvoice(body, user as User);
  }
}