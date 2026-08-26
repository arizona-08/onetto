import { Module } from '@nestjs/common';
import { DocumentModule } from 'src/documents/document.module';
import { MailModule } from 'src/mail/mail.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BridgeWebhookController } from './bridge-webhook.controller';
import { BridgeProviderService } from './bridge-provider.service';
import { BridgeWebhookHandler } from './webhook-handlers/webhook.handler';
import { BridgeStatusMatcherService } from './bridge-status-matcher.service';
import { InvoicePaymentStatusModule } from 'src/invoice-payments/invoice-payment-status.module';

@Module({
  imports: [PrismaModule, MailModule, InvoicePaymentStatusModule],
  controllers: [BridgeWebhookController],
  providers: [
    BridgeProviderService,
    BridgeWebhookHandler,
    BridgeStatusMatcherService,
  ],
  exports: [BridgeProviderService],
})
export class BridgeModule {}
