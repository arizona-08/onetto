import { Body, Controller, Get, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { WebhookTransactionDto } from "./webhook-handlers/dtos/transaction.dto";
import { BridgeWebhookHandler } from "./webhook-handlers/webhook.handler";

@Controller("api/bridge/webhooks")
export class BridgeWebhookController {
  constructor(private readonly bridgeWebhookHandler: BridgeWebhookHandler) {}

  @Post("payment")
  async handlePaymentTransactionAttempt(@Body() webhook: WebhookTransactionDto | any) {
    // console.log(webhook);
    await this.bridgeWebhookHandler.handleWebhook(webhook)

    return { message: "Webhook received successfully" };
  }

  // temporary endpoint to redirect to the frontend callback URL
  @Get('payment/callback')
  paymentCallback(@Res() res: Response) {
    return res.redirect('http://localhost:3000/payment/callback');
  }
}