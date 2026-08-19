import { Controller, Post } from "@nestjs/common";

@Controller("api/webhooks/gocardless")
export class GoCardlessWebhookController{
  constructor() {}

  @Post()
  async handleWebhook(webhook: any): Promise<void> {
    console.log("Received GoCardless webhook:", webhook);
    // redirect to the correct webhook handle depending on the event type 'mandate' | 'payment' | 'payout' | 'subscription'
  }
}