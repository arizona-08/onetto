import { Controller } from "@nestjs/common";

@Controller("api/webhooks/gocardless")
export class GoCardlessWebhookController{
  constructor() {}
  async handleWebhook(webhook: any): Promise<void> {
    // redirect to the correct webhook handle depending on the event type 'mandate' | 'payment' | 'payout' | 'subscription'
  }
}