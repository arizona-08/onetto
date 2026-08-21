import { Body, Controller, Post } from "@nestjs/common";
import { GoCardlessEventDto, GoCardlessWebhookDto } from "./webhook-handlers/dtos/event.dto";
import { GoCardlessWebhookService } from "./gocardless-webhook.service";

@Controller("api/gocardless/webhooks")
export class GoCardlessWebhookController{
  constructor(
    private readonly goCardlessWebhookService: GoCardlessWebhookService
  ) {}

  @Post()
  async handleWebhook(@Body() webhook: GoCardlessWebhookDto): Promise<void> {
    return await this.goCardlessWebhookService.redirectWebhookToHandler(webhook);
  }

  @Post('test')
  async handleWebhookTest(@Body() webhook: GoCardlessWebhookDto): Promise<void> {
    console.log("Received GoCardless webhook test:", webhook);
    console.log("Received GoCardless webhook.events / :", webhook.events);
    // redirect to the correct webhook handle depending on the event type 'mandate' | 'payment' | 'payout' | 'subscription'
  }
}