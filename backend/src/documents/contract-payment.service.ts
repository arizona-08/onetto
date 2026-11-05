import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { GoCardlessOAuthService } from 'src/Adapters/PaymentAdapters/gocardless/gocardless-oauth.service';
import type { User } from 'src/types/extended-request.types';
import { buildContractInvoiceLines } from './contract-invoice-lines';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SuperPdpEreportingService } from 'src/electronic-invoicing/superpdp-ereporting.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { SuperPdpB2bService } from 'src/electronic-invoicing/superpdp-b2b.service';

@Injectable()
export class ContractPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth: GoCardlessOAuthService,
    private readonly config: ConfigService,
    private readonly reporting: SuperPdpEreportingService,
    private readonly notifications: NotificationsService,
    private readonly b2b: SuperPdpB2bService,
  ) {}

  async prepareStageInvoice(stageId: string, user: User) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "ContractPaymentStage" WHERE id = ${stageId} FOR UPDATE
      `;
      if (!locked.length) throw new BadRequestException('Jalon introuvable.');
      const stage = await tx.contractPaymentStage.findUnique({
        where: { id: stageId },
        include: {
          plan: {
            include: {
              estimate: { include: { company: true, services: true } },
              stages: { include: { invoice: true }, orderBy: { sequence: 'asc' } },
            },
          },
        },
      });
      if (!stage) throw new BadRequestException('Jalon introuvable.');
      const plan = stage.plan;
      const estimate = plan.estimate;
      const allowed = estimate.company.ownerId === user.id || Boolean(await tx.companyUser.findFirst({
        where: { companyId: estimate.companyId, userId: user.id, role: 'ADMIN', isHidden: false },
      }));
      if (!allowed || estimate.company.status !== 'ACTIVE') {
        throw new BadRequestException('Cette action n’est pas autorisée pour cette entreprise.');
      }
      if (!plan.acceptedAt || estimate.estimateStatus !== 'ACCEPTED' || plan.cancelledAt || stage.cancelledAt) {
        throw new BadRequestException('Le contrat n’est pas actif.');
      }
      if (stage.invoiceId) return { invoiceId: stage.invoiceId, alreadyPrepared: true };
      const earlier = plan.stages.filter((item) => item.sequence < stage.sequence);
      if (earlier.some((item) => !item.invoice || item.invoice.invoiceStatus === 'DRAFT')) {
        throw new BadRequestException('Émettez d’abord les factures des jalons précédents.');
      }
      if (stage.kind === 'BALANCE' && earlier.some((item) =>
        !item.invoice || !['PAID', 'PAID_MANUALLY'].includes(item.invoice.invoiceStatus)
      )) {
        throw new BadRequestException('Le solde ne peut être facturé tant que les acomptes précédents ne sont pas encaissés.');
      }
      const deposits = plan.stages.filter((item) => item.kind === 'DEPOSIT').map((item) => ({
        percentage: item.percentage,
        triggerCondition: item.triggerCondition,
      }));
      const amount = buildContractInvoiceLines(
        estimate.services,
        plan.totalAmountInCents,
        deposits,
        stage.sequence - 1,
      );
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${estimate.companyId}), 1001)`;
      const currentYear = new Date().getFullYear();
      const prefix = `#FACT-${currentYear}-`;
      const existingNumbers = await tx.document.findMany({
        where: { companyId: estimate.companyId, type: 'INVOICE', documentNumber: { startsWith: prefix } },
        select: { documentNumber: true },
      });
      const last = existingNumbers.reduce((max, item) => Math.max(max, Number(item.documentNumber?.slice(prefix.length)) || 0), 0);
      const documentNumber = `${prefix}${String(last + 1).padStart(4, '0')}`;
      const invoice = await tx.document.create({
        data: {
          companyId: estimate.companyId,
          type: 'INVOICE',
          sourceDocumentId: estimate.id,
          isFromEstimate: true,
          documentNumber,
          invoiceStatus: 'DRAFT',
          estimateStatus: 'ACCEPTED',
          paymentDueAt: new Date(Date.now() + 7 * 86_400_000),
          clientName: estimate.clientName,
          clientEmail: estimate.clientEmail,
          clientAddress: estimate.clientAddress,
          clientCity: estimate.clientCity,
          clientPostalCode: estimate.clientPostalCode,
          clientCountry: estimate.clientCountry,
          clientType: estimate.clientType,
          clientSiren: estimate.clientSiren,
          clientVatNumber: estimate.clientVatNumber,
          clientElectronicAddress: estimate.clientElectronicAddress,
          clientElectronicAddressScheme: estimate.clientElectronicAddressScheme,
          clientIsVatTaxable: estimate.clientIsVatTaxable,
          clientForeignIdentifier: estimate.clientForeignIdentifier,
          deliveryAddress: estimate.deliveryAddress,
          deliveryCity: estimate.deliveryCity,
          deliveryPostalCode: estimate.deliveryPostalCode,
          deliveryCountry: estimate.deliveryCountry,
          operationNature: estimate.operationNature,
          currencyCode: estimate.currencyCode,
          isVatExempt: estimate.isVatExempt,
          vatExemptionReason: estimate.vatExemptionReason,
          totalPrice: amount.totalPrice,
          totalPriceExcludingTax: amount.totalPriceExcludingTax,
          services: { create: amount.lines },
        },
      });
      await tx.contractPaymentStage.update({ where: { id: stageId }, data: { invoiceId: invoice.id } });
      return { invoiceId: invoice.id, alreadyPrepared: false };
    });
  }

  async getStagePaymentPreview(stageId: string, user: User) {
    const stage = await this.prisma.contractPaymentStage.findUnique({
      where: { id: stageId },
      include: {
        invoice: true,
        payment: true,
        plan: {
          include: {
            estimate: { include: { company: { include: { companyUsers: { where: { userId: user.id, role: 'ADMIN', isHidden: false } } } } } },
            stages: { include: { invoice: true } },
          },
        },
      },
    });
    if (!stage) throw new NotFoundException('Jalon introuvable.');
    const { plan } = stage;
    const { estimate } = plan;
    if (estimate.company.status !== 'ACTIVE' ||
      (estimate.company.ownerId !== user.id && estimate.company.companyUsers.length === 0)) {
      throw new ForbiddenException('Vous ne pouvez pas déclencher ce prélèvement.');
    }
    if (plan.cancelledAt || stage.cancelledAt || !plan.acceptedAt || estimate.estimateStatus !== 'ACCEPTED') {
      throw new BadRequestException('Le contrat n’est plus actif.');
    }
    if (!stage.invoice || stage.invoice.invoiceStatus !== 'PENDING' ||
      Math.round(stage.invoice.totalPrice * 100) !== stage.amountInCents ||
      stage.invoice.companyId !== estimate.companyId) {
      throw new BadRequestException('La facture de ce jalon doit être envoyée et correspondre au montant du contrat.');
    }
    if (stage.payment) {
      throw new ConflictException('Un règlement existe déjà pour ce jalon.');
    }
    if (!plan.providerMandateId || plan.mandateStatus !== 'ACTIVE') {
      throw new BadRequestException('Le mandat SEPA doit être autorisé avant ce prélèvement.');
    }
    const client = await this.oauth.getClientForCompany(estimate.companyId);
    const mandate = await client.mandates.find(plan.providerMandateId);
    if (!mandate || mandate.status !== 'active') {
      await this.prisma.contractPaymentPlan.update({
        where: { id: plan.id },
        data: { mandateStatus: mandate?.status === 'cancelled' ? 'REVOKED' : 'FAILED' },
      });
      throw new BadRequestException('Le mandat SEPA n’est plus actif.');
    }
    const earlierUnpaidInCents = plan.stages
      .filter((item) => item.sequence < stage.sequence && item.invoice && !['PAID', 'PAID_MANUALLY'].includes(item.invoice.invoiceStatus))
      .reduce((sum, item) => sum + item.amountInCents, 0);
    const chargeDate = mandate.next_possible_charge_date;
    if (!chargeDate || !/^\d{4}-\d{2}-\d{2}$/.test(chargeDate)) {
      throw new BadRequestException('GoCardless n’a pas fourni de date de prélèvement possible.');
    }
    return {
      clientName: stage.invoice.clientName,
      invoiceNumber: stage.invoice.documentNumber,
      amountInCents: stage.amountInCents,
      stageName: stage.kind === 'BALANCE' ? 'Solde' : `${stage.sequence}${stage.sequence === 1 ? 'er' : 'e'} acompte`,
      chargeDate,
      earlierUnpaidInCents,
      companyId: estimate.companyId,
      mandateId: plan.providerMandateId,
      invoiceId: stage.invoice.id,
    };
  }

  async triggerStagePayment(stageId: string, user: User, acknowledgeUnpaidPrevious: boolean) {
    const preview = await this.getStagePaymentPreview(stageId, user);
    if (preview.earlierUnpaidInCents > 0 && !acknowledgeUnpaidPrevious) {
      throw new BadRequestException('Confirmez explicitement la présence des acomptes précédents impayés.');
    }
    const idempotencyKey = `contract-stage-${stageId}`;
    try {
      await this.prisma.contractStagePayment.create({
        data: { stageId, idempotencyKey, amountInCents: preview.amountInCents, requestedByUserId: user.id },
      });
    } catch (error) {
      const existing = await this.prisma.contractStagePayment.findUnique({ where: { stageId } });
      if (existing) throw new ConflictException('Ce prélèvement est déjà enregistré ou nécessite une vérification.');
      throw error;
    }
    // The reservation is committed before the provider call. Any uncertain
    // response remains blocked for manual verification, never auto-created again.
    await this.prisma.contractStagePayment.update({ where: { stageId }, data: { status: 'CREATING' } });
    try {
      const client = await this.oauth.getClientForCompany(preview.companyId);
      const payment = await client.payments.create({
        amount: String(preview.amountInCents),
        currency: 'EUR',
        charge_date: preview.chargeDate,
        description: `${preview.stageName} ${preview.invoiceNumber}`.slice(0, 140),
        links: { mandate: preview.mandateId },
        metadata: { contract_stage_id: stageId, invoice_id: preview.invoiceId },
      }, idempotencyKey);
      if (!payment.id || payment.links?.mandate !== preview.mandateId || Number(payment.amount) !== preview.amountInCents) {
        throw new Error('Paiement GoCardless incohérent.');
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.contractStagePayment.update({
          where: { stageId },
          data: {
            providerPaymentId: payment.id,
            status: 'PENDING',
            chargeDate: payment.charge_date ? new Date(`${payment.charge_date}T12:00:00Z`) : null,
          },
        });
        await tx.document.update({ where: { id: preview.invoiceId }, data: { invoiceStatus: 'PAYMENT_IN_PROGRESS' } });
      });
      return { providerPaymentId: payment.id, chargeDate: payment.charge_date };
    } catch (error) {
      await this.prisma.contractStagePayment.update({ where: { stageId }, data: { status: 'UNCERTAIN', failureReason: error instanceof Error ? error.message.slice(0, 500) : 'Réponse GoCardless incertaine' } });
      throw new ConflictException('La création du prélèvement doit être vérifiée auprès de GoCardless avant toute nouvelle action.');
    }
  }

  async cancelContractPlan(planId: string, user: User) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "ContractPaymentPlan" WHERE id = ${planId} FOR UPDATE
      `;
      if (!locked.length) throw new NotFoundException('Contrat introuvable.');
      const plan = await tx.contractPaymentPlan.findUnique({
        where: { id: planId },
        include: {
          estimate: { include: { company: { include: { companyUsers: { where: { userId: user.id, role: 'ADMIN', isHidden: false } } } } } },
          stages: { include: { payment: true } },
        },
      });
      if (!plan) throw new NotFoundException('Contrat introuvable.');
      const company = plan.estimate.company;
      if (company.status !== 'ACTIVE' || (company.ownerId !== user.id && company.companyUsers.length === 0)) {
        throw new ForbiddenException('Vous ne pouvez pas annuler ce contrat.');
      }
      if (plan.cancelledAt) return { cancelledAt: plan.cancelledAt };
      if (plan.stages.some((stage) => stage.payment && ['RESERVED', 'CREATING', 'UNCERTAIN', 'PENDING', 'IN_PROGRESS'].includes(stage.payment.status))) {
        throw new ConflictException('Un prélèvement est en cours ou doit être vérifié. Traitez-le avant d’annuler le contrat.');
      }
      const cancelledAt = new Date();
      await tx.contractPaymentPlan.update({ where: { id: planId }, data: { cancelledAt } });
      await tx.contractPaymentStage.updateMany({
        where: { planId, invoiceId: null }, data: { cancelledAt },
      });
      return { cancelledAt };
    });
  }

  async retryStagePayment(stageId: string, user: User) {
    const stage = await this.prisma.contractPaymentStage.findUnique({
      where: { id: stageId },
      include: {
        invoice: true, payment: true,
        plan: { include: { estimate: { include: { company: { include: { companyUsers: { where: { userId: user.id, role: 'ADMIN', isHidden: false } } } } } } } },
      },
    });
    if (!stage) throw new NotFoundException('Jalon introuvable.');
    const { plan } = stage;
    const company = plan.estimate.company;
    if (company.status !== 'ACTIVE' || (company.ownerId !== user.id && company.companyUsers.length === 0)) {
      throw new ForbiddenException('Vous ne pouvez pas relancer ce prélèvement.');
    }
    if (plan.cancelledAt || stage.cancelledAt || !stage.payment?.providerPaymentId ||
      stage.payment.status !== 'FAILED' || stage.payment.automaticRetryScheduled ||
      stage.payment.manualRetryRequestedAt || stage.invoice?.invoiceStatus !== 'REJECTED' || !plan.providerMandateId) {
      throw new BadRequestException('Ce prélèvement n’est pas éligible à une relance manuelle.');
    }
    const client = await this.oauth.getClientForCompany(plan.estimate.companyId);
    const [payment, mandate] = await Promise.all([
      client.payments.find(stage.payment.providerPaymentId),
      client.mandates.find(plan.providerMandateId),
    ]);
    if (payment.status !== 'failed' || payment.links?.mandate !== plan.providerMandateId ||
      Number(payment.amount) !== stage.amountInCents || mandate.status !== 'active') {
      throw new BadRequestException('Le paiement ou le mandat GoCardless n’est pas éligible à une relance.');
    }
    const reserved = await this.prisma.contractStagePayment.updateMany({
      where: { id: stage.payment.id, status: 'FAILED', automaticRetryScheduled: false, manualRetryRequestedAt: null },
      data: { status: 'IN_PROGRESS', manualRetryRequestedAt: new Date() },
    });
    if (reserved.count !== 1) throw new ConflictException('Une relance est déjà en cours.');
    try {
      const retried = await client.payments.retry(stage.payment.providerPaymentId);
      if (retried.id && retried.id !== stage.payment.providerPaymentId) throw new Error('GoCardless a retourné un autre paiement.');
      await this.prisma.$transaction(async (tx) => {
        await tx.contractStagePayment.update({
          where: { id: stage.payment!.id },
          data: {
            status: 'IN_PROGRESS',
            chargeDate: retried.charge_date ? new Date(`${retried.charge_date}T12:00:00Z`) : stage.payment!.chargeDate,
            failureReason: null,
          },
        });
        await tx.document.update({ where: { id: stage.invoice!.id }, data: { invoiceStatus: 'PAYMENT_IN_PROGRESS' } });
      });
      return { providerPaymentId: stage.payment.providerPaymentId, status: 'IN_PROGRESS' };
    } catch (error) {
      const statusCode = (error as { statusCode?: number; response?: { statusCode?: number } })?.statusCode ??
        (error as { response?: { statusCode?: number } })?.response?.statusCode;
      const definitive = [400, 401, 403, 404, 422].includes(statusCode ?? 0);
      await this.prisma.contractStagePayment.update({
        where: { id: stage.payment.id },
        data: {
          status: definitive ? 'FAILED' : 'UNCERTAIN',
          manualRetryRequestedAt: definitive ? null : new Date(),
          failureReason: error instanceof Error ? error.message.slice(0, 500) : 'Réponse GoCardless incertaine',
        },
      });
      throw new ConflictException(definitive
        ? 'GoCardless refuse cette relance. Vérifiez le paiement et le mandat.'
        : 'La réponse GoCardless est incertaine. Vérifiez le paiement avant toute nouvelle action.');
    }
  }

  async markStagePaidManually(stageId: string, user: User) {
    const stage = await this.prisma.contractPaymentStage.findUnique({
      where: { id: stageId },
      include: {
        invoice: true, payment: true,
        plan: { include: { estimate: { include: { company: { include: { companyUsers: { where: { userId: user.id, role: 'ADMIN', isHidden: false } } } } } } } },
      },
    });
    if (!stage?.invoice || !stage.payment?.providerPaymentId) {
      throw new BadRequestException('Cette facture ne possède pas de prélèvement échoué à régulariser.');
    }
    const company = stage.plan.estimate.company;
    if (company.status !== 'ACTIVE' || (company.ownerId !== user.id && company.companyUsers.length === 0)) {
      throw new ForbiddenException('Vous ne pouvez pas enregistrer ce règlement.');
    }
    if (stage.payment.status !== 'FAILED' || stage.payment.automaticRetryScheduled || stage.payment.manualRetryRequestedAt ||
      stage.payment.manualSettlementAt || stage.invoice.invoiceStatus !== 'REJECTED') {
      throw new ConflictException('Ce prélèvement est encore actif, en relance ou déjà régularisé.');
    }
    const client = await this.oauth.getClientForCompany(stage.plan.estimate.companyId);
    const providerPayment = await client.payments.find(stage.payment.providerPaymentId);
    if (!['failed', 'charged_back', 'cancelled'].includes(providerPayment.status as string) ||
      Number(providerPayment.amount) !== stage.amountInCents ||
      providerPayment.links?.mandate !== stage.plan.providerMandateId) {
      throw new ConflictException('Le paiement GoCardless doit être définitivement échoué avant un règlement manuel.');
    }
    const settledAt = new Date();
    const changed = await this.prisma.$transaction(async (tx) => {
      const reserved = await tx.contractStagePayment.updateMany({
        where: { id: stage.payment!.id, status: 'FAILED', manualSettlementAt: null, manualRetryRequestedAt: null, automaticRetryScheduled: false },
        data: { manualSettlementAt: settledAt, manualSettlementByUserId: user.id },
      });
      if (reserved.count !== 1) return false;
      const invoice = await tx.document.updateMany({
        where: { id: stage.invoice!.id, invoiceStatus: 'REJECTED' },
        data: { invoiceStatus: 'PAID_MANUALLY' },
      });
      if (invoice.count !== 1) throw new ConflictException('La facture a changé de statut.');
      return true;
    });
    if (!changed) throw new ConflictException('Ce règlement a déjà été enregistré.');
    try {
      await this.reporting.syncCollectedPaymentsForInvoice(stage.invoice.id);
      await this.b2b.reportContractStagePayment(stage.invoice.id);
    } catch (error) {
      // The settlement remains recorded; documentary reporting is reconciled separately.
      console.error(`Déclaration du règlement manuel ${stage.invoice.id} à vérifier :`, error);
    }
    return { settledAt };
  }

  async getMandateAuthorisation(token: string) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "ContractPaymentPlan" WHERE "authorizationToken" = ${token} FOR UPDATE
        `;
        if (!rows.length) {
          throw new BadRequestException('Ce lien d’autorisation est introuvable.');
        }
        const plan = await tx.contractPaymentPlan.findUnique({
          where: { authorizationToken: token },
          include: {
            estimate: {
              select: {
                companyId: true,
                clientName: true,
                clientEmail: true,
                clientAddress: true,
                clientCity: true,
                clientPostalCode: true,
                clientCountry: true,
                estimateStatus: true,
                company: { select: { status: true } },
              },
            },
          },
        });
        if (
          !plan?.acceptedAt ||
          plan.estimate.estimateStatus !== 'ACCEPTED' ||
          plan.estimate.company.status !== 'ACTIVE' ||
          plan.cancelledAt
        ) {
          throw new BadRequestException('Ce contrat ne peut plus être autorisé.');
        }
        if (plan.mandateStatus === 'REVOKED' || (plan.providerMandateId && plan.mandateStatus === 'FAILED')) {
          return { url: null, message: 'Ce mandat n’est plus utilisable. Contactez l’entreprise.' };
        }
        if (plan.providerMandateId) {
          const client = await this.oauth.getClientForCompany(plan.estimate.companyId);
          const mandate = await client.mandates.find(plan.providerMandateId);
          const mandateStatus = mandate.status === 'active' ? 'ACTIVE' :
            ['cancelled', 'blocked', 'expired'].includes(mandate.status as string) ? 'REVOKED' : 'PENDING';
          await tx.contractPaymentPlan.update({ where: { id: plan.id }, data: { mandateStatus } });
          return { url: null, message: mandateStatus === 'ACTIVE' ? 'Le mandat est autorisé.' : mandateStatus === 'REVOKED' ? 'Ce mandat n’est plus utilisable. Contactez l’entreprise.' : 'Le mandat est en cours d’activation.' };
        }
        if (plan.mandateStatus === 'ACTIVE') {
          return { url: null, message: 'Le mandat a déjà été autorisé.' };
        }
        if (!plan.authorizationExpiresAt || plan.authorizationExpiresAt <= new Date()) {
          return { url: null, message: 'Le délai de 30 jours pour autoriser le mandat est dépassé. Contactez l’entreprise.' };
        }

        const client = await this.oauth.getClientForCompany(plan.estimate.companyId);
        let billingRequestId = plan.providerBillingRequestId;
        if (!billingRequestId) {
          const request = await client.billingRequests.create(
            { mandate_request: { scheme: 'sepa_core' } },
            `contract-mandate-${plan.id}`,
          );
          billingRequestId = request.id;
          await tx.contractPaymentPlan.update({
            where: { id: plan.id },
            data: { providerBillingRequestId: billingRequestId, mandateStatus: 'PENDING' },
          });
        }

        const billingRequest = await client.billingRequests.find(billingRequestId);
        if (billingRequest.status === 'fulfilled') {
          const mandateId = billingRequest.links?.mandate_request_mandate;
          if (!mandateId) throw new BadRequestException('GoCardless n’a pas retourné le mandat autorisé.');
          const mandate = await client.mandates.find(mandateId);
          await tx.contractPaymentPlan.update({
            where: { id: plan.id },
            data: {
              providerMandateId: mandateId,
              mandateStatus: mandate.status === 'active' ? 'ACTIVE' : 'PENDING',
            },
          });
          return { url: null, message: mandate.status === 'active' ? 'Le mandat est autorisé.' : 'Le mandat est en cours d’activation.' };
        }
        if (billingRequest.status === 'fulfilling' || billingRequest.status === 'ready_to_fulfil') {
          return { url: null, message: 'Le mandat est en cours d’activation.' };
        }
        if (billingRequest.status !== 'pending') {
          return { url: null, message: 'Cette demande d’autorisation n’est plus utilisable. Contactez l’entreprise.' };
        }
        if (plan.providerFlowUrl && plan.providerFlowExpiresAt && plan.providerFlowExpiresAt > new Date()) {
          return { url: plan.providerFlowUrl };
        }

        const redirectUri = this.config.get<string>('GOCARDLESS_REDIRECT_URI') || '';
        const parts = plan.estimate.clientName.trim().split(/\s+/);
        const country = plan.estimate.clientCountry.trim().toUpperCase();
        const flow = await client.billingRequestFlows.create({
          redirect_uri: redirectUri,
          exit_uri: redirectUri,
          prefilled_customer: {
            email: plan.estimate.clientEmail,
            given_name: parts[0],
            family_name: parts.slice(1).join(' ') || undefined,
            address_line1: plan.estimate.clientAddress,
            city: plan.estimate.clientCity,
            postal_code: plan.estimate.clientPostalCode,
            country_code: ['FRANCE', 'FRA', 'FR'].includes(country) ? 'FR' : country,
          },
          links: { billing_request: billingRequestId },
        }, `contract-flow-${plan.id}-${plan.providerFlowId ?? 'initial'}`);
        const expiresAt = new Date(flow.expires_at ?? '');
        if (!flow.id || !flow.authorisation_url || !Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) {
          throw new BadRequestException('GoCardless n’a pas fourni de parcours d’autorisation valide.');
        }
        await tx.contractPaymentPlan.update({
          where: { id: plan.id },
          data: {
            providerFlowId: flow.id,
            providerFlowUrl: flow.authorisation_url,
            providerFlowExpiresAt: expiresAt,
          },
        });
        return { url: flow.authorisation_url };
      },
      { timeout: 30_000 },
    );
    if (result.message === 'Le mandat est autorisé.') {
      const plan = await this.prisma.contractPaymentPlan.findUnique({
        where: { authorizationToken: token },
        select: { id: true, estimate: { select: { id: true, companyId: true } } },
      });
      if (plan) {
        try {
          await this.notifications.notifyCompany({
            companyId: plan.estimate.companyId,
            type: 'CONTRACT_MANDATE_ACTIVE',
            title: 'Mandat de prélèvement autorisé',
            message: 'Le mandat du devis à acomptes est prêt. Aucun paiement n’a été déclenché.',
            href: `/documents/${plan.estimate.id}`,
            deduplicationKey: `contract-mandate:${plan.id}`,
          });
        } catch {
          // The mandate state is persisted even if notification delivery fails.
        }
      }
    }
    return result;
  }
}
