import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  message: string;
};

type InstalmentWithPlan = {
  id: string;
  instalmentNumber: number;
  amountInCents: number;
  providerPaymentId: string | null;
  instalmentStatus: 'PENDING' | 'PAYMENT_IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'OVERDUE';
  automaticRetryScheduled: boolean;
  invoiceInstalmentPlan: {
    invoiceId: string;
    providerMandateId: string | null;
    invoice: {
      id: string;
      type: string;
      companyId: string;
      company: {
        ownerId: string;
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
        instalmentStatus: { in: ['FAILED', 'OVERDUE'] },
      },
      data: { instalmentStatus: 'PAYMENT_IN_PROGRESS' },
    });
    if (lock.count !== 1) {
      throw new BadRequestException(
        'Cette échéance est déjà en cours de traitement.',
      );
    }

    let payment;
    try {
      // The GoCardless retry endpoint resubmits the existing Payment. It never
      // creates another Payment nor another Onetto instalment.
      await client.payments.retry(instalment.providerPaymentId);
      payment = await client.payments.find(instalment.providerPaymentId);
    } catch (error) {
      await this.prismaService.invoicePaymentInstalment.update({
        where: { id: instalment.id },
        data: {
          instalmentStatus: 'FAILED',
          automaticRetryScheduled: false,
        },
      });
      throw error;
    }

    const instalmentStatus = this.statusFromPayment(payment?.status);

    await this.prismaService.invoicePaymentInstalment.update({
      where: { id: instalment.id },
      data: {
        instalmentStatus,
        automaticRetryScheduled: false,
        ...(instalmentStatus === 'SUCCESS' ? { paidAt: new Date() } : {}),
      },
    });
    await this.invoicePaymentStatusService.refreshFromInstalment(
      instalment.invoiceInstalmentPlan.invoiceId,
      instalmentStatus === 'SUCCESS' ? instalment.amountInCents : undefined,
    );

    return {
      canRetryManually: false,
      automaticRetryScheduled: false,
      mandateActionRequired: false,
      message: 'Le prélèvement a été resoumis à GoCardless.',
    };
  }

  async requiresMandateReauthorisation(
    documentId: string,
    user: User,
  ): Promise<boolean> {
    const instalment = await this.prismaService.invoicePaymentInstalment.findFirst({
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
      return this.unavailable('Le prélèvement GoCardless n’est pas encore disponible.');
    }

    const client = await this.gocardlessOAuthService.getClientForCompany(
      instalment.invoiceInstalmentPlan.invoice.companyId,
    );
    const payment = await client.payments.find(instalment.providerPaymentId);
    if (!payment) {
      return this.unavailable('Le prélèvement GoCardless est introuvable.');
    }

    const nextChargeDate = payment.charge_date ?? undefined;
    if (payment.status !== 'failed') {
      return {
        canRetryManually: false,
        automaticRetryScheduled: false,
        mandateActionRequired: false,
        ...(nextChargeDate ? { nextChargeDate } : {}),
        message: 'Le prélèvement est déjà en cours de traitement par GoCardless.',
      };
    }

    if (instalment.automaticRetryScheduled) {
      return {
        canRetryManually: false,
        automaticRetryScheduled: true,
        mandateActionRequired: false,
        ...(nextChargeDate ? { nextChargeDate } : {}),
        message: 'GoCardless réessaiera automatiquement ce prélèvement.',
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
      const mandateActionRequired = !mandate || INVALID_MANDATE_STATUSES.has(
        mandate.status ?? '',
      );
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
      ...(nextChargeDate ? { nextChargeDate } : {}),
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

  private async getAuthorisedInstalment(
    documentId: string,
    instalmentNumber: number,
    user: User,
  ): Promise<InstalmentWithPlan> {
    const instalment = await this.prismaService.invoicePaymentInstalment.findFirst({
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
                    companyUsers: {
                      where: { userId: user.id },
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
    if (!instalment || instalment.invoiceInstalmentPlan.invoice.type !== 'INVOICE') {
      throw new NotFoundException('Échéance introuvable.');
    }

    const company = instalment.invoiceInstalmentPlan.invoice.company;
    if (company.ownerId !== user.id && company.companyUsers.length === 0) {
      throw new ForbiddenException('Vous n’avez pas accès à cette échéance.');
    }
    return instalment;
  }

  private statusFromPayment(
    paymentStatus: string | undefined,
  ): 'PAYMENT_IN_PROGRESS' | 'SUCCESS' | 'FAILED' {
    if (paymentStatus === 'confirmed' || paymentStatus === 'paid_out') {
      return 'SUCCESS';
    }
    if (paymentStatus === 'failed') {
      return 'FAILED';
    }
    return 'PAYMENT_IN_PROGRESS';
  }
}
