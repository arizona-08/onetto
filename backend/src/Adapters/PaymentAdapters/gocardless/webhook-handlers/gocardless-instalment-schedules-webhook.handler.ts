import { Injectable } from "@nestjs/common";

@Injectable()
export class GoCardlessInstalmentSchedulesWebhookHandler {
  async handleWebhook(webhook: any): Promise<void> {
    console.log("Received GoCardless webhook for instalment schedules:", webhook);
    // Implement the logic to handle the webhook for instalment schedules here
  }
}