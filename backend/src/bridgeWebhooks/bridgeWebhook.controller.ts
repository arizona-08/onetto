import { Body, Controller, Post } from "@nestjs/common";

@Controller("api/bridge/webhooks")
export class BridgeWebhookController {
  constructor() {}

  @Post("payment-transaction/created")
  async handlePaymentTransactionCreated(@Body() payload: any) {
    console.log("Received payment transaction created webhook:", payload);

    return { message: "Webhook received successfully" };
  }

  @Post("payment-transaction/updated")
  async handlePaymentTransactionUpdated(@Body() payload: any) {
    console.log("Received payment transaction updated webhook:", payload);

    return { message: "Webhook received successfully" };
  }
}