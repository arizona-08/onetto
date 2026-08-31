import { Module } from '@nestjs/common';
import { MailModule } from 'src/mail/mail.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { InvoicePaymentStatusService } from './invoice-payment-status.service';
import { ElectronicInvoicingModule } from 'src/electronic-invoicing/electronic-invoicing.module';

@Module({
  imports: [PrismaModule, MailModule, ElectronicInvoicingModule],
  providers: [InvoicePaymentStatusService],
  exports: [InvoicePaymentStatusService],
})
export class InvoicePaymentStatusModule {}
