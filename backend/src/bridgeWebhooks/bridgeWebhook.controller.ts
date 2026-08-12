import { Body, Controller, Get, Post, Res } from "@nestjs/common";
import type { Response } from "express";

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

  // temporary endpoint to redirect to the frontend callback URL
  @Get('payment/callback')
  paymentCallback(@Res() res: Response) {
    return res.redirect('http://localhost:3000/payment/callback');
  }
}