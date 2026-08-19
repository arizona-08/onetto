import { Body, Controller, Post } from "@nestjs/common";

@Controller("api/gocardless/webhooks")
export class GoCardlessWebhookController{
  constructor() {}

  @Post()
  async handleWebhook(@Body() webhook: any): Promise<void> {
    console.log("Received GoCardless webhook / :", webhook);
    // redirect to the correct webhook handle depending on the event type 'mandate' | 'payment' | 'payout' | 'subscription'
  }

  @Post('test')
  async handleWebhookTest(@Body() webhook: any): Promise<void> {
    console.log("Received GoCardless webhook test:", webhook.events);
    // redirect to the correct webhook handle depending on the event type 'mandate' | 'payment' | 'payout' | 'subscription'
  }
}