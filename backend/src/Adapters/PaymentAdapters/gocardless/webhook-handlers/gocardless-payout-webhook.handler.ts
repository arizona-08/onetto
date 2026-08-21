import { Injectable } from "@nestjs/common";
import { WebhookHandlerInterface } from "../../Interfaces/WebhookHandler.interface";

@Injectable()
export class GoCardlessPayoutWebhookHandler implements WebhookHandlerInterface {
  constructor() {}

  async handleWebhook(webhook: any): Promise<void> {

  }

  isRelevantAction(action: string): boolean {
    const relevantActions = [
      ''
    ]

    return relevantActions.includes(action);
  }
}