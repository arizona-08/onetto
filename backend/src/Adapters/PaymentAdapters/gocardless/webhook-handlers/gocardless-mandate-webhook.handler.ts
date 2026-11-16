import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GoCardlessOAuthService } from '../gocardless-oauth.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { WebhookHandlerInterface } from '../../Interfaces/WebhookHandler.interface';
import { finalizePendingContractAcceptance } from 'src/documents/contract-acceptance';

@Injectable()
export class GoCardlessMandateWebhookHandler implements WebhookHandlerInterface {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth: GoCardlessOAuthService,
    private readonly notifications: NotificationsService,
  ) {}

  async handleWebhook(webhook: any): Promise<void> {
    if (!this.isRelevantAction(webhook.action) || !webhook.links?.mandate) return;
    const plan = await this.prisma.contractPaymentPlan.findUnique({
      where: { providerMandateId: webhook.links.mandate },
      select: { id: true, providerBillingRequestId: true, acceptanceRequestedAt: true, estimate: { select: { id: true, companyId: true } } },
    });
    if (!plan) return;
    const account = await this.prisma.companyPaymentAccount.findFirst({
      where: {
        companyId: plan.estimate.companyId,
        provider: 'GOCARDLESS',
        providerAccountId: webhook.organisation_id,
      },
    });
    if (!account) throw new Error('Mandat reçu depuis un autre compte GoCardless.');
    const client = await this.oauth.getClientForProviderAccount(webhook.organisation_id);
    const mandate = await client.mandates.find(webhook.links.mandate);
    await this.prisma.contractPaymentPlan.update({
      where: { id: plan.id },
      data: {
        mandateStatus: mandate.status === 'active' ? 'ACTIVE' : ['cancelled', 'blocked', 'expired'].includes(mandate.status as string) ? 'REVOKED' : 'FAILED',
      },
    });
    if (mandate.status === 'active' && plan.acceptanceRequestedAt && plan.providerBillingRequestId) {
      const request = await client.billingRequests.find(plan.providerBillingRequestId);
      if (request.status === 'fulfilled') {
        await finalizePendingContractAcceptance(this.prisma, this.notifications, plan.id);
      }
    }
    if (mandate.status === 'active') {
      await this.notifications.notifyCompany({
        companyId: plan.estimate.companyId,
        type: 'CONTRACT_MANDATE_ACTIVE',
        title: 'Mandat de prélèvement autorisé',
        message: 'Le mandat du devis à acomptes est prêt. Aucun paiement n’a été déclenché.',
        href: `/documents/${plan.estimate.id}`,
        deduplicationKey: `contract-mandate:${plan.id}`,
      });
    }
  }

  isRelevantAction(action: string): boolean {
    const relevantActions = ['active', 'failed', 'cancelled', 'blocked', 'expired'];

    return relevantActions.includes(action);
  }
}
