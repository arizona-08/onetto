import { Injectable, Logger } from '@nestjs/common';
import { WebhookHandlerInterface } from '../../Interfaces/WebhookHandler.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { GoCardlessReconciliationService } from '../gocardless-reconciliation.service';
import { GoCardlessEventDto } from './dtos/event.dto';

@Injectable()
export class GoCardlessInstalmentSchedulesWebhookHandler implements WebhookHandlerInterface {
  private readonly logger = new Logger(
    GoCardlessInstalmentSchedulesWebhookHandler.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly reconciliation: GoCardlessReconciliationService,
  ) {}

  async handleWebhook(webhook: GoCardlessEventDto): Promise<void> {
    if (!this.isRelevantAction(webhook.action)) return;
    const scheduleId = webhook.links.instalment_schedule;
    if (!scheduleId) return;
    const plan = await this.prisma.invoiceInstalmentPlan.findFirst({
      where: { providerScheduledId: scheduleId },
      select: { id: true },
    });
    if (!plan) {
      this.logger.warn(`Échéancier GoCardless ${scheduleId} inconnu.`);
      return;
    }
    await this.reconciliation.reconcilePaymentPlan(plan.id);
  }

  isRelevantAction(action: string): boolean {
    const relevantActions = [
      'created',
      'updated',
      'completed',
      'cancelled',
      'errored',
    ];

    return relevantActions.includes(action);
  }
}
