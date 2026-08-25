import { Body, Controller, Post } from "@nestjs/common";
import { SubscriptionWebhookService } from "./subscription-webhook.service";

@Controller('api/stripe/webhook')
export class SubscriptionWebhookController {
  constructor(
    private readonly subscriptionWebhookService: SubscriptionWebhookService
  ){}

  @Post()
  async handleStripeWebhook(@Body() body: any) {
    await this.subscriptionWebhookService.handleWebhook(body);
  }
}