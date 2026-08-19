import { Module } from "@nestjs/common";
import { GoCardlessWebhookController } from "./gocardless-webhook.controller";
import { GoCardlessProviderService } from "./gocardless-provider.service";
import { GoCardlessMandateWebhookHandler } from "./webhook-handlers/gocardless-mandate-webhook.handler";
import { GoCardlessPaymentWebhookHandler } from "./webhook-handlers/gocardless-payment-webhook.handler";
import { GoCardlessPayoutWebhookHandler } from "./webhook-handlers/gocardless-payout-webhook.handler";
import { GoCardlessSubscriptionWebhookHandler } from "./webhook-handlers/gocardless-subscription-webhook.handler";
import { PrismaModule } from "src/prisma/prisma.module";
import { MailModule } from "src/mail/mail.module";
import { InvoicePaymentFeeModule } from "src/payment-fee/invoice-payment-fee.module";
import { GoCardlessOAuthController } from "./gocardless-oauth.controller";
import { GoCardlessOAuthService } from "./gocardless-oauth.service";
import { GoCardlessStatusMatcherService } from "./gocardless-status-matcher.service";
import { GoCardlessInstalmentSchedulesWebhookHandler } from "./webhook-handlers/gocardless-instalment-schedules-webhook.handler";
import { GoCardlessWebhookService } from "./gocardless-webhook.service";

@Module({
  imports: [PrismaModule, MailModule, InvoicePaymentFeeModule],
  controllers: [GoCardlessWebhookController, GoCardlessOAuthController],
  providers: [
    GoCardlessProviderService,
    GoCardlessMandateWebhookHandler,
    GoCardlessPaymentWebhookHandler,
    GoCardlessInstalmentSchedulesWebhookHandler,
    GoCardlessPayoutWebhookHandler,
    GoCardlessSubscriptionWebhookHandler,
    GoCardlessWebhookService,
    GoCardlessOAuthService,
    GoCardlessStatusMatcherService
  ],
  exports: [GoCardlessProviderService],
})
export class GoCardlessModule {}