import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { GoCardlessClient } from 'gocardless-nodejs';
import { PlanAccessService } from 'src/plan-access/plan-access.service';
import { PrismaService } from 'src/prisma/prisma.service';
import type { User } from 'src/types/extended-request.types';
import { InvoicePaymentStatusService } from 'src/invoice-payments/invoice-payment-status.service';
import { GoCardlessOAuthService } from './gocardless-oauth.service';

export type InstalmentRetryCapability = {
  canRetryManually: boolean;
  automaticRetryScheduled: boolean;
  mandateActionRequired: boolean;
  nextChargeDate?: string;
  failureReason?: string;
  lastAttemptAt?: string;
  message: string;
};

type InstalmentWithPlan = {
  id: string;
  instalmentNumber: number;
  amountInCents: number;
  providerPaymentId: string | null;
  instalmentStatus:
    | 'PENDING'
    | 'PAYMENT_IN_PROGRESS'
    | 'SUCCESS'
    | 'FAILED'
    | 'OVERDUE';
  automaticRetryScheduled: boolean;
  manualRetryRequestedAt: Date | null;
  invoiceInstalmentPlan: {
    invoiceId: string;
    providerMandateId: string | null;
    invoice: {
      id: string;
      type: string;
      companyId: string;
      company: {
        ownerId: string;
        status: string;
        companyUsers: Array<{ id: string }>;
      };
    };
  };
};

const INVALID_MANDATE_STATUSES = new Set([
  'failed',
  'cancelled',
  'expired',
  'consumed',
  'blocked',
  'suspended_by_payer',
]);

const FAILURE_REASONS: Record<string, string> = {
  insufficient_funds: 'Fonds insuffisants sur le compte du client.',
  refer_to_payer: 'Le client doit vérifier la disponibilité des fonds.',
  mandate_cancelled: 'Le mandat de prélèvement a été annulé.',
  bank_account_closed: 'Le compte bancaire du client est fermé.',
  invalid_bank_details: 'Les coordonnées bancaires du client sont invalides.',
  test_failure: 'Échec simulé dans l’environnement de test.',
};

type PaymentHistory = {
  retryCount: number;
  failureReason?: string;
  lastAttemptAt?: string;
  latestOutcome?: { at: Date; action: string; willAttemptRetry: boolean };
};

@Injectable()
export class GoCardlessInstalmentRetryService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly gocardlessOAuthService: GoCardlessOAuthService,
    private readonly planAccessService: PlanAccessService,
    private readonly invoicePaymentStatusService: InvoicePaymentStatusService,
  ) {}

  async getCapability(
    documentId: string,
    instalmentNumber: number,
    user: User,
  ): Promise<InstalmentRetryCapability> {
    const instalment = await this.getAuthorisedInstalment(
      documentId,
      instalmentNumber,
      user,
    );
    return this.getCapabilityForInstalment(instalment);
  }

  async retry(
    documentId: string,
    instalmentNumber: number,
    user: User,
  ): Promise<InstalmentRetryCapability> {
    const instalment = await this.getAuthorisedInstalment(
      documentId,
      instalmentNumber,
      user,
    );
    const capability = await this.getCapabilityForInstalment(instalment);
    if (!capability.canRetryManually || !instalment.providerPaymentId) {
      throw new BadRequestException(capability.message);
    }

    const client = await this.gocardlessOAuthService.getClientForCompany(
      instalment.invoiceInstalmentPlan.invoice.companyId,
    );

    // Atomically reserve this local instalment before contacting GoCardless.
    // It prevents two near-simultaneous clicks (or API calls) from resubmitting
    // the same provider Payment more than once.
    const lock = await this.prismaService.invoicePaymentInstalment.updateMany({
      where: {
        id: instalment.id,
        automaticRetryScheduled: false,
        manualRetryRequestedAt: null,
        instalmentStatus: { in: ['FAILED', 'OVERDUE'] },
      },
      data: {
        instalmentStatus: 'PAYMENT_IN_PROGRESS',
        manualRetryRequestedAt: new Date(),
      },
    });
    if (lock.count !== 1) {
      throw new BadRequestException(
        'Cette échéance est déjà en cours de traitement.',
      );
    }

    let payment: { charge_date?: string | null };
    try {
      // The GoCardless retry endpoint resubmits the existing Payment. It never
      // creates another Payment nor another Onetto instalment.
      payment = await client.payments.retry(instalment.providerPaymentId);
    } catch (error) {
      if (this.isDefinitiveProviderRejection(error)) {
        await this.prismaService.invoicePaymentInstalment.updateMany({
          where: {
            id: instalment.id,
            manualRetryRequestedAt: { not: null },
            instalmentStatus: 'PAYMENT_IN_PROGRESS',
          },
          data: { instalmentStatus: 'FAILED', manualRetryRequestedAt: null },
        });
        await this.invoicePaymentStatusService.refreshFromInstalment(
          instalment.invoiceInstalmentPlan.invoiceId,
        );
        throw new BadRequestException(this.providerRejectionMessage(error));
      }

      // An unknown response may mean GoCardless accepted the action. Read the
      // Payment, but keep the reservation until a subsequent webhook confirms
      // the outcome. Never send another retry merely because it still says failed.
      try {
        const current = await client.payments.find(
          instalment.providerPaymentId,
        );
        if (current?.status && current.status !== 'failed') {
          await this.prismaService.invoicePaymentInstalment.updateMany({
            where: {
              id: instalment.id,
              manualRetryRequestedAt: { not: null },
              instalmentStatus: 'PAYMENT_IN_PROGRESS',
            },
            data: { instalmentStatus: 'PAYMENT_IN_PROGRESS' },
          });
        }
      } catch {
        // The provider may be unavailable; the reservation remains in place.
      }
      await this.invoicePaymentStatusService.refreshFromInstalment(
        instalment.invoiceInstalmentPlan.invoiceId,
      );
      throw new ServiceUnavailableException(
        'La réponse de GoCardless est incertaine. Le prélèvement est en cours de vérification ; ne relancez pas la demande.',
      );
    }

    // A successful retry request is not a collected payment. Webhooks remain
    // responsible for marking the instalment and the invoice as paid.
    await this.prismaService.invoicePaymentInstalment.updateMany({
      where: {
        id: instalment.id,
        manualRetryRequestedAt: { not: null },
        instalmentStatus: 'PAYMENT_IN_PROGRESS',
      },
      data: { instalmentStatus: 'PAYMENT_IN_PROGRESS' },
    });
    await this.invoicePaymentStatusService.refreshFromInstalment(
      instalment.invoiceInstalmentPlan.invoiceId,
    );

    return {
      canRetryManually: false,
      automaticRetryScheduled: false,
      mandateActionRequired: false,
      ...(payment?.charge_date ? { nextChargeDate: payment.charge_date } : {}),
      message:
        'La nouvelle tentative a été demandée à GoCardless. Le statut sera actualisé dès que de nouvelles informations seront disponibles.',
    };
  }

  async requiresMandateReauthorisation(
    documentId: string,
    user: User,
  ): Promise<boolean> {
    const instalment =
      await this.prismaService.invoicePaymentInstalment.findFirst({
        where: {
          instalmentStatus: { in: ['FAILED', 'OVERDUE'] },
          invoiceInstalmentPlan: { invoiceId: documentId },
        },
        select: { instalmentNumber: true },
        orderBy: { instalmentNumber: 'asc' },
      });
    if (!instalment) return false;

    const capability = await this.getCapability(
      documentId,
      instalment.instalmentNumber,
      user,
    );
    return capability.mandateActionRequired;
  }

  private async getCapabilityForInstalment(
    instalment: InstalmentWithPlan,
  ): Promise<InstalmentRetryCapability> {
    if (!instalment.providerPaymentId) {
      return this.unavailable(
        'Le prélèvement GoCardless n’est pas encore disponible.',
      );
    }

    const client = await this.gocardlessOAuthService.getClientForCompany(
      instalment.invoiceInstalmentPlan.invoice.companyId,
    );
    const payment = await client.payments.find(instalment.providerPaymentId);
    if (!payment) {
      return this.unavailable('Le prélèvement GoCardless est introuvable.');
    }

    const nextChargeDate = payment.charge_date ?? undefined;
    const history = await this.getPaymentHistory(
      client,
      instalment.providerPaymentId,
    );
    if (instalment.manualRetryRequestedAt && history.latestOutcome) {
      await this.reconcilePendingRetry(instalment, payment.status, history);
    }
    const details = {
      ...(nextChargeDate ? { nextChargeDate } : {}),
      ...(history.failureReason
        ? { failureReason: history.failureReason }
        : {}),
      ...(history.lastAttemptAt
        ? { lastAttemptAt: history.lastAttemptAt }
        : {}),
    };
    if (instalment.manualRetryRequestedAt) {
      return {
        canRetryManually: false,
        automaticRetryScheduled: false,
        mandateActionRequired: false,
        ...details,
        message:
          'Une nouvelle tentative est en cours de vérification par GoCardless.',
      };
    }
    if (instalment.instalmentStatus === 'SUCCESS') {
      return {
        ...this.unavailable('Cette échéance est déjà réglée.'),
        ...details,
      };
    }
    if (instalment.instalmentStatus === 'PAYMENT_IN_PROGRESS') {
      return {
        ...this.unavailable('Ce prélèvement est déjà en cours.'),
        ...details,
      };
    }
    if (payment.status !== 'failed') {
      return {
        canRetryManually: false,
        automaticRetryScheduled: false,
        mandateActionRequired: false,
        ...details,
        message:
          payment.status === 'charged_back'
            ? 'Ce paiement a été retourné par la banque. Contactez le client.'
            : 'Le prélèvement est déjà en cours de traitement par GoCardless.',
      };
    }

    if (instalment.automaticRetryScheduled) {
      return {
        canRetryManually: false,
        automaticRetryScheduled: true,
        mandateActionRequired: false,
        ...details,
        message: 'GoCardless réessaiera automatiquement ce prélèvement.',
      };
    }

    if (history.retryCount >= 3) {
      return {
        ...this.unavailable(
          'La limite de trois tentatives GoCardless est atteinte.',
        ),
        ...details,
      };
    }

    const mandateId =
      payment.links?.mandate ??
      instalment.invoiceInstalmentPlan.providerMandateId;
    if (!mandateId) {
      return {
        canRetryManually: false,
        automaticRetryScheduled: false,
        mandateActionRequired: true,
        message: 'Le mandat de prélèvement doit être réautorisé par le client.',
      };
    }

    const mandate = await client.mandates.find(mandateId);
    if (!mandate || mandate.status !== 'active') {
      const mandateActionRequired =
        !mandate || INVALID_MANDATE_STATUSES.has(mandate.status ?? '');
      return {
        canRetryManually: false,
        automaticRetryScheduled: false,
        mandateActionRequired,
        message: mandateActionRequired
          ? 'Le mandat de prélèvement n’est plus valide. Le client doit donner une nouvelle autorisation.'
          : 'Le mandat n’est pas encore utilisable pour un nouveau prélèvement.',
      };
    }

    return {
      canRetryManually: true,
      automaticRetryScheduled: false,
      mandateActionRequired: false,
      ...details,
      message: 'Le prélèvement a échoué et peut être resoumis.',
    };
  }

  private unavailable(message: string): InstalmentRetryCapability {
    return {
      canRetryManually: false,
      automaticRetryScheduled: false,
      mandateActionRequired: false,
      message,
    };
  }

  private async getPaymentHistory(
    client: GoCardlessClient,
    providerPaymentId: string,
  ): Promise<PaymentHistory> {
    let retryCount = 0;
    let lastFailureAt = '';
    let failureReason: string | undefined;
    let lastAttemptAt = '';
    let latestOutcome: PaymentHistory['latestOutcome'];
    for await (const event of client.events.all({
      payment: providerPaymentId,
    })) {
      if (event.action === 'resubmission_requested') retryCount += 1;
      if (
        (event.action === 'submitted' ||
          event.action === 'resubmission_requested') &&
        event.created_at &&
        event.created_at > lastAttemptAt
      ) {
        lastAttemptAt = event.created_at;
      }
      if (
        event.action === 'failed' &&
        event.created_at &&
        event.created_at > lastFailureAt
      ) {
        lastFailureAt = event.created_at;
        failureReason = event.details?.cause
          ? (FAILURE_REASONS[event.details.cause] ??
            'Le prélèvement a été refusé par la banque.')
          : undefined;
      }
      if (
        event.created_at &&
        event.action &&
        [
          'resubmission_requested',
          'submitted',
          'confirmed',
          'paid_out',
          'failed',
          'charged_back',
        ].includes(event.action) &&
        (!latestOutcome || event.created_at > latestOutcome.at.toISOString())
      ) {
        latestOutcome = {
          at: new Date(event.created_at),
          action: event.action,
          willAttemptRetry: event.details?.will_attempt_retry === true,
        };
      }
    }
    return {
      retryCount,
      ...(failureReason ? { failureReason } : {}),
      ...(lastAttemptAt ? { lastAttemptAt } : {}),
      ...(latestOutcome ? { latestOutcome } : {}),
    };
  }

  private async reconcilePendingRetry(
    instalment: InstalmentWithPlan,
    paymentStatus: string | undefined,
    history: PaymentHistory,
  ): Promise<void> {
    const outcome = history.latestOutcome;
    if (!outcome || !instalment.manualRetryRequestedAt) return;
    if (outcome.at < instalment.manualRetryRequestedAt) return;
    if (
      !paymentStatus ||
      ![
        'failed',
        'pending_submission',
        'pending_customer_approval',
        'submitted',
        'confirmed',
        'paid_out',
      ].includes(paymentStatus)
    )
      return;
    if (paymentStatus === 'failed' && outcome.action !== 'failed') return;
    if (paymentStatus === 'charged_back') return;

    const status =
      paymentStatus === 'failed'
        ? 'FAILED'
        : paymentStatus === 'confirmed' || paymentStatus === 'paid_out'
          ? 'SUCCESS'
          : 'PAYMENT_IN_PROGRESS';
    const automaticRetryScheduled =
      status === 'FAILED' && outcome.willAttemptRetry;
    const updated =
      await this.prismaService.invoicePaymentInstalment.updateMany({
        where: {
          id: instalment.id,
          manualRetryRequestedAt: instalment.manualRetryRequestedAt,
          instalmentStatus: 'PAYMENT_IN_PROGRESS',
        },
        data: {
          instalmentStatus: status,
          manualRetryRequestedAt: null,
          automaticRetryScheduled,
          lastProviderEventAt: outcome.at,
          ...(status === 'SUCCESS' ? { paidAt: outcome.at } : {}),
        },
      });
    if (updated.count !== 1) return;
    instalment.instalmentStatus = status;
    instalment.manualRetryRequestedAt = null;
    instalment.automaticRetryScheduled = automaticRetryScheduled;
    await this.invoicePaymentStatusService.refreshFromInstalment(
      instalment.invoiceInstalmentPlan.invoiceId,
      status === 'SUCCESS' ? instalment.amountInCents : undefined,
      instalment.id,
    );
  }

  private providerErrorReasons(error: unknown): string[] {
    const source = error as {
      reason?: string;
      errors?: Array<{ reason?: string }>;
      response?: {
        body?: { error?: { errors?: Array<{ reason?: string }> } };
      };
    } | null;
    return [
      source?.reason,
      ...(source?.errors?.map((item) => item.reason) ?? []),
      ...(source?.response?.body?.error?.errors?.map((item) => item.reason) ??
        []),
    ].filter((reason): reason is string => typeof reason === 'string');
  }

  private isDefinitiveProviderRejection(error: unknown): boolean {
    const source = error as {
      statusCode?: number;
      response?: { statusCode?: number };
    } | null;
    const status = source?.statusCode ?? source?.response?.statusCode;
    return (
      status === 400 ||
      status === 401 ||
      status === 403 ||
      status === 404 ||
      status === 422 ||
      this.providerErrorReasons(error).some((reason) =>
        ['retry_failed', 'mandate_is_inactive', 'validation_failed'].includes(
          reason,
        ),
      )
    );
  }

  private providerRejectionMessage(error: unknown): string {
    const reasons = this.providerErrorReasons(error);
    if (reasons.includes('mandate_is_inactive')) {
      return 'Le mandat bancaire n’est plus actif. Le client doit le réautoriser.';
    }
    if (reasons.includes('retry_failed')) {
      return 'GoCardless refuse cette nouvelle tentative. Le paiement peut ne plus être éligible ou avoir atteint sa limite de retries.';
    }
    return 'GoCardless refuse la nouvelle tentative de prélèvement. Vérifiez le paiement et le mandat.';
  }

  private async getAuthorisedInstalment(
    documentId: string,
    instalmentNumber: number,
    user: User,
  ): Promise<InstalmentWithPlan> {
    const instalment =
      await this.prismaService.invoicePaymentInstalment.findFirst({
        where: {
          instalmentNumber,
          invoiceInstalmentPlan: { invoiceId: documentId },
        },
        select: {
          id: true,
          instalmentNumber: true,
          amountInCents: true,
          instalmentStatus: true,
          providerPaymentId: true,
          automaticRetryScheduled: true,
          manualRetryRequestedAt: true,
          invoiceInstalmentPlan: {
            select: {
              invoiceId: true,
              providerMandateId: true,
              invoice: {
                select: {
                  id: true,
                  type: true,
                  companyId: true,
                  company: {
                    select: {
                      ownerId: true,
                      status: true,
                      companyUsers: {
                        where: {
                          userId: user.id,
                          role: 'ADMIN',
                          isHidden: false,
                        },
                        select: { id: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    if (
      !instalment ||
      instalment.invoiceInstalmentPlan.invoice.type !== 'INVOICE'
    ) {
      throw new NotFoundException('Échéance introuvable.');
    }

    const company = instalment.invoiceInstalmentPlan.invoice.company;
    if (
      company.status !== 'ACTIVE' ||
      (company.ownerId !== user.id && company.companyUsers.length === 0)
    ) {
      throw new ForbiddenException('Vous n’avez pas accès à cette échéance.');
    }
    return instalment;
  }
}
