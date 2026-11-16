import { ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';

/** A completed GoCardless Billing Request is the durable proof of authorisation. */
export async function finalizePendingContractAcceptance(
  prisma: PrismaService,
  notifications: NotificationsService,
  planId: string,
): Promise<boolean> {
  const acceptedEstimate = await prisma.$transaction(async (tx) => {
    const plan = await tx.contractPaymentPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        estimateId: true,
        acceptanceRequestedAt: true,
        acceptedAt: true,
        cancelledAt: true,
        providerBillingRequestId: true,
        providerMandateId: true,
        estimate: {
          select: {
            companyId: true,
            documentNumber: true,
            estimateStatus: true,
            isLastVersion: true,
            company: { select: { status: true } },
          },
        },
      },
    });
    if (
      !plan?.acceptanceRequestedAt ||
      plan.acceptedAt ||
      plan.cancelledAt ||
      !plan.providerBillingRequestId ||
      !plan.providerMandateId ||
      plan.estimate.estimateStatus !== 'SENT' ||
      !plan.estimate.isLastVersion ||
      plan.estimate.company.status !== 'ACTIVE'
    ) return null;

    const negotiation = await tx.estimateNegociation.findFirst({
      where: { documentId: plan.estimateId, status: 'PENDING' },
      select: { id: true },
    });
    if (!negotiation) return null;
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "EstimateNegociation" WHERE id = ${negotiation.id} FOR UPDATE
    `;

    const reserved = await tx.contractPaymentPlan.updateMany({
      where: { id: plan.id, acceptedAt: null, cancelledAt: null },
      data: { acceptedAt: new Date() },
    });
    if (reserved.count !== 1) return null;
    const estimate = await tx.document.updateMany({
      where: { id: plan.estimateId, estimateStatus: 'SENT' },
      data: { estimateStatus: 'ACCEPTED' },
    });
    const decision = await tx.estimateNegociation.updateMany({
      where: { id: negotiation.id, status: 'PENDING' },
      data: { status: 'ACCEPTED' },
    });
    if (estimate.count !== 1 || decision.count !== 1) {
      throw new ConflictException('Le devis a changé pendant son autorisation.');
    }
    return {
      estimateId: plan.estimateId,
      companyId: plan.estimate.companyId,
      documentNumber: plan.estimate.documentNumber,
    };
  });

  if (!acceptedEstimate) return false;
  try {
    await notifications.notifyCompany({
      companyId: acceptedEstimate.companyId,
      type: 'ESTIMATE_ACCEPTED',
      title: 'Devis accepté',
      message: `Le devis ${acceptedEstimate.documentNumber} a été accepté par le client après autorisation du mandat SEPA.`,
      href: `/documents/${acceptedEstimate.estimateId}`,
      deduplicationKey: `estimate:${acceptedEstimate.estimateId}:accepted`,
    });
  } catch {
    // The authorisation and acceptance are durable even if notification delivery fails.
  }
  return true;
}
