import { Injectable } from "@nestjs/common";

@Injectable()
export class SubscriptionWebhookService {
  constructor() {}

  async handleWebhook(body: any){
    console.log("Handling Stripe webhook:", body);
  }
}