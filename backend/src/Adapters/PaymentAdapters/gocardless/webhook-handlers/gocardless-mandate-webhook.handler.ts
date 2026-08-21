import { Injectable } from "@nestjs/common";
import { WebhookHandlerInterface } from "../../Interfaces/WebhookHandler.interface";

@Injectable()
export class GoCardlessMandateWebhookHandler implements WebhookHandlerInterface {
  constructor() {}

  async handleWebhook(webhook: any): Promise<void> {

  }

  isRelevantAction(action: string): boolean {
    const relevantActions = [
      'active',
      'failed',
      'cancelled',
    ]

    return relevantActions.includes(action);
  }

  async handleMandate(){
    
  }
}