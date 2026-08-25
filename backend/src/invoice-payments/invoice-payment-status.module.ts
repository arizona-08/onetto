import { Module } from '@nestjs/common';
import { MailModule } from 'src/mail/mail.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { InvoicePaymentStatusService } from './invoice-payment-status.service';

@Module({
  imports: [PrismaModule, MailModule],
  providers: [InvoicePaymentStatusService],
  exports: [InvoicePaymentStatusService],
})
export class InvoicePaymentStatusModule {}
