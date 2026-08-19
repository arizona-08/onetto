import { Injectable } from "@nestjs/common";
import { GoCardlessInstalmentSchedulesWebhookHandler } from "./webhook-handlers/gocardless-instalment-schedules-webhook.handler";
import { GoCardlessMandateWebhookHandler } from "./webhook-handlers/gocardless-mandate-webhook.handler";
import { GoCardlessPaymentWebhookHandler } from "./webhook-handlers/gocardless-payment-webhook.handler";
import { GoCardlessWebhookDto } from "./webhook-handlers/dtos/event.dto";

@Injectable()
export class GoCardlessWebhookService {
  constructor(
    private readonly instalmentSchedulesHandler: GoCardlessInstalmentSchedulesWebhookHandler,
    private readonly mandateHandler: GoCardlessMandateWebhookHandler,
    private readonly paymentHandler: GoCardlessPaymentWebhookHandler,
    private readonly subscriptionHandler: GoCardlessPaymentWebhookHandler,
  ){}

  async redirectWebhookToHandler(webhook: GoCardlessWebhookDto): Promise<void> {
    console.log("Redirecting GoCardless webhook to the appropriate handler:", webhook);
    // Implement the logic to redirect the webhook to the correct handler based on the event type
  }
}