import { Injectable } from "@nestjs/common";
import { WebhookHandlerInterface } from "../../Interfaces/WebhookHandler.interface";

@Injectable()
export class GoCardlessInstalmentSchedulesWebhookHandler implements WebhookHandlerInterface {
  async handleWebhook(webhook: any): Promise<void> {
    console.log("Received GoCardless webhook for instalment schedules:", webhook);
    // Implement the logic to handle the webhook for instalment schedules here
  }

  isRelevantAction(action: string): boolean {
    const relevantActions = [
      'created',
      'updated',
      'deleted'
    ];

    return relevantActions.includes(action);
  }
}