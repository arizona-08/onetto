import { Injectable, Logger } from '@nestjs/common';
import { WebhookHandlerInterface } from '../../Interfaces/WebhookHandler.interface';

@Injectable()
export class GoCardlessInstalmentSchedulesWebhookHandler implements WebhookHandlerInterface {
  private readonly logger = new Logger(
    GoCardlessInstalmentSchedulesWebhookHandler.name,
  );

  async handleWebhook(webhook: any): Promise<void> {
    // A schedule in `errored` only tells us that at least one of its Payments
    // failed. The Payment webhook remains the source of truth for each local
    // instalment, so this event must never finalise nor recreate instalments.
    if (webhook.action === 'errored') {
      this.logger.warn(
        `GoCardless instalment schedule ${webhook.links?.instalment_schedule ?? webhook.links?.self ?? 'unknown'} is errored; reconciling its Payments individually.`,
      );
    }
  }

  isRelevantAction(action: string): boolean {
    const relevantActions = [
      'created',
      'updated',
      'deleted',
      'errored',
    ];

    return relevantActions.includes(action);
  }
}
