import { Body, Controller, Get, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { WebhookTransactionDto } from "./dtos/transaction.dto";
import { BridgeWebhookService } from "./bridgeWebhook.service";

@Controller("api/bridge/webhooks")
export class BridgeWebhookController {
  constructor(private readonly bridgeWebhookService: BridgeWebhookService) {}

  @Post("payment")
  async handlePaymentTransactionCreated(@Body() webhook: WebhookTransactionDto | any) {
    // console.log(webhook);
    await this.bridgeWebhookService.handleWebhook(webhook)

    return { message: "Webhook received successfully" };
  }

  // temporary endpoint to redirect to the frontend callback URL
  @Get('payment/callback')
  paymentCallback(@Res() res: Response) {
    return res.redirect('http://localhost:3000/payment/callback');
  }
}