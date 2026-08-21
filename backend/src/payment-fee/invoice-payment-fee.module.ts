import { Module } from "@nestjs/common";
import { InvoicePaymentFeeService } from "./invoice-payment-fee.service";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [InvoicePaymentFeeService],
  exports: [InvoicePaymentFeeService]
})
export class InvoicePaymentFeeModule {}