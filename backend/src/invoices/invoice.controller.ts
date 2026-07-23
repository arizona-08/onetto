import { Body, Controller, Get, Param, Post, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { InvoiceService } from "./invoice.service";
import { CreateInvoiceDto } from "./dtos/create-invoice.dto";
import type { ExtendedRequest, User } from "src/types/extended-request.types";
import { AuthGuard } from "src/auth/auth.guard";

@UseGuards(AuthGuard)
@Controller("api/invoices")
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService
  ) {}

  @Get("mines")
  async getMyInvoices(@Req() req: ExtendedRequest, @Query("with-services") withServices: boolean) {
    const user = req.user;
    if(!user){
      throw new UnauthorizedException("Non authentifié");
    }

    return await this.invoiceService.getInvoicesByUser(user, withServices);
  }

  @Get(":invoiceId")
  async getInvoiceById(@Param("invoiceId") invoiceId: string, @Query("with-services") withServices: boolean, @Req() req: ExtendedRequest) {
    const user = req.user;
    if(!user){
      throw new UnauthorizedException("Non authentifié");
    }

    return await this.invoiceService.getInvoiceById(invoiceId, user, withServices);

  }

  @Post("create")
  async createInvoice(@Body() body: CreateInvoiceDto, @Req() req: ExtendedRequest){
    const user = req.user;
    return await this.invoiceService.createInvoice(body, user as User);
  }
}
