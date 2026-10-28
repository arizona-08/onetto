import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountClosureStatus, Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';
import Stripe from 'stripe';
import { CompaniesService } from 'src/companies/companies.service';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AccountClosureService {
  private readonly logger = new Logger(AccountClosureService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly companies: CompaniesService,
    private readonly mail: MailService,
    config: ConfigService,
  ) {
    this.stripe = new Stripe(config.getOrThrow<string>('STRIPE_SECRET_KEY'));
  }

  async close(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, closedAt: true },
    });
    if (!user) throw new UnauthorizedException('Compte indisponible.');
    if (user.closedAt) return { closed: true };
    if (!(await argon2.verify(user.password, password))) {
      throw new BadRequestException('Mot de passe incorrect.');
    }

    const at = new Date();
    const unusablePassword = await argon2.hash(randomBytes(32).toString('hex'));
    let result: boolean;
    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          // The conditional update locks the user row. A concurrent request cannot
          // create another closure or close only a subset of the owned companies.
          const claimed = await tx.user.updateMany({
            where: { id: userId, closedAt: null, password: user.password },
            data: {
              closedAt: at,
              passwordChangedAt: at,
              password: unusablePassword,
              lastConnectedCompanyId: null,
              emailVerificationTokenHash: null,
              emailVerificationExpiresAt: null,
              passwordResetTokenHash: null,
              passwordResetExpiresAt: null,
            },
          });
          if (claimed.count === 0) return false;

          await tx.accountClosure.create({ data: { userId } });
          const owned = await tx.company.findMany({
            where: { ownerId: userId },
            select: {
              id: true,
              name: true,
              companyUsers: { select: { userId: true } },
            },
          });
          for (const company of owned) {
            await this.companies.closeCompany(
              tx,
              company.id,
              'Fermeture de l’espace Onetto après clôture du compte propriétaire',
              at,
              true,
            );
            const recipients = [
              ...new Set(company.companyUsers.map((member) => member.userId)),
            ].filter((id) => id !== userId);
            if (recipients.length) {
              await tx.appNotification.createMany({
                data: recipients.map((recipientId) => ({
                  userId: recipientId,
                  companyId: company.id,
                  type: 'COMPANY_CLOSED' as const,
                  title: 'Espace entreprise fermé',
                  message: `L’espace Onetto de l’entreprise ${company.name} a été fermé. Votre accès opérationnel est terminé.`,
                  deduplicationKey: `company-closed-${company.id}`,
                })),
                skipDuplicates: true,
              });
            }
          }
          const companyIds = owned.map((company) => company.id);
          if (companyIds.length) {
            await tx.user.updateMany({
              where: { lastConnectedCompanyId: { in: companyIds } },
              data: { lastConnectedCompanyId: null },
            });
            await tx.companyPaymentOAuthState.deleteMany({
              where: { companyId: { in: companyIds } },
            });
            await tx.electronicInvoicingOAuthState.deleteMany({
              where: { companyId: { in: companyIds } },
            });
            await tx.electronicInvoicingConnection.updateMany({
              where: { companyId: { in: companyIds }, status: 'ACTIVE' },
              data: { status: 'SUSPENDED' },
            });
          }
          // Preserve CompanyUser on owned companies for attribution. CLOSED must
          // be enforced by all operational authorization checks.
          await tx.companyUser.deleteMany({
            where: { userId, companyId: { notIn: companyIds } },
          });
          return true;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      // Serializable transactions can reject one of two simultaneous requests.
      // If the other request committed, this one is already satisfied.
      const existing = await this.prisma.accountClosure.findUnique({
        where: { userId },
      });
      if (!existing) throw error;
      result = false;
    }

    if (!result) {
      const existing = await this.prisma.accountClosure.findUnique({
        where: { userId },
      });
      if (!existing)
        throw new UnauthorizedException('Le compte a été modifié. Réessayez.');
    }
    if (result) {
      void this.process(userId).catch((error: unknown) =>
        this.logger.error(`Clôture ${userId} différée : ${String(error)}`),
      );
    }
    return { closed: true };
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async resumePending() {
    const closures = await this.prisma.accountClosure.findMany({
      where: {
        status: { not: 'COMPLETED' },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
      },
      select: { userId: true },
      take: 20,
    });
    for (const closure of closures) {
      await this.process(closure.userId).catch((error: unknown) =>
        this.logger.error(
          `Reprise de la clôture ${closure.userId} : ${String(error)}`,
        ),
      );
    }
  }

  listPending() {
    return this.prisma.accountClosure.findMany({
      where: { status: { not: 'COMPLETED' } },
      select: {
        userId: true,
        status: true,
        pendingActions: true,
        reviewedActions: true,
        requestedAt: true,
        lastAttemptAt: true,
        nextAttemptAt: true,
        lastError: true,
      },
      orderBy: { requestedAt: 'asc' },
      take: 100,
    });
  }

  async acknowledgeReview(userId: string, action: string) {
    if (
      !/^(GOCARDLESS_REVIEW|SUPERPDP_REVIEW|PAYMENT_LINK_REVIEW):[^:]+$/.test(
        action,
      ) &&
      action !== 'STRIPE_SCHEDULE_REVIEW'
    ) {
      throw new BadRequestException('Action de revue inconnue.');
    }
    const closure = await this.prisma.accountClosure.findUnique({
      where: { userId },
      select: { pendingActions: true, reviewedActions: true },
    });
    if (!closure?.pendingActions.includes(action)) {
      throw new BadRequestException('Action absente de cette clôture.');
    }
    if (!closure.reviewedActions.includes(action)) {
      await this.prisma.accountClosure.update({
        where: { userId },
        data: { reviewedActions: { push: action }, nextAttemptAt: new Date() },
      });
    }
    await this.process(userId);
    return { acknowledged: true };
  }

  async process(userId: string) {
    const now = new Date();
    const claimed = await this.prisma.accountClosure.updateMany({
      where: {
        userId,
        status: { not: 'COMPLETED' },
        OR: [
          { processingAt: null },
          { processingAt: { lt: new Date(now.getTime() - 5 * 60_000) } },
        ],
      },
      data: { processingAt: now, lastAttemptAt: now },
    });
    if (claimed.count !== 1) return;
    try {
      const pending: string[] = [];
      let errorCode: string | null = null;
      const closure = await this.prisma.accountClosure.findUniqueOrThrow({
        where: { userId },
        select: { reviewedActions: true },
      });
      const subscription = await this.prisma.userSubscription.findUnique({
        where: { userId },
        select: { subscriptionId: true, pendingStripeScheduleId: true },
      });
      if (subscription?.subscriptionId) {
        try {
          const remote = await this.stripe.subscriptions.retrieve(
            subscription.subscriptionId,
          );
          if (remote.status !== 'canceled' && !remote.cancel_at_period_end) {
            // Preserve the paid period while preventing another renewal.
            await this.stripe.subscriptions.update(
              remote.id,
              { cancel_at_period_end: true },
              {
                idempotencyKey: `account-closure-${userId}-cancel-renewal`,
              },
            );
          }
          const confirmed = await this.stripe.subscriptions.retrieve(remote.id);
          if (
            confirmed.status !== 'canceled' &&
            !confirmed.cancel_at_period_end
          ) {
            pending.push('STRIPE_CANCELLATION');
          }
          if (subscription.pendingStripeScheduleId)
            pending.push('STRIPE_SCHEDULE_REVIEW');
        } catch {
          pending.push('STRIPE_CANCELLATION');
          errorCode = 'STRIPE_UNAVAILABLE';
        }
      }

      const companies = await this.prisma.company.findMany({
        where: { ownerId: userId, closedByAccountClosureAt: { not: null } },
        select: {
          id: true,
          companyPaymentAccount: { select: { id: true } },
          electronicInvoicingConnection: {
            select: { accessTokenEncrypted: true, refreshTokenEncrypted: true },
          },
        },
      });
      for (const company of companies) {
        const [activePayments, activeInstalments] = await Promise.all([
          this.prisma.payByBankPayment.count({
            where: {
              invoice: { companyId: company.id },
              status: { in: ['PENDING', 'PAYMENT_IN_PROGRESS'] },
            },
          }),
          this.prisma.invoicePaymentInstalment.count({
            where: {
              invoiceInstalmentPlan: {
                invoice: { companyId: company.id },
                providerScheduledId: { not: null },
              },
              instalmentStatus: { in: ['PENDING', 'PAYMENT_IN_PROGRESS'] },
            },
          }),
        ]);
        if (activePayments || activeInstalments)
          pending.push(`PAYMENT_SETTLEMENT:${company.id}`);
        if (company.companyPaymentAccount)
          pending.push(`GOCARDLESS_REVIEW:${company.id}`);
        if (
          company.electronicInvoicingConnection?.accessTokenEncrypted ||
          company.electronicInvoicingConnection?.refreshTokenEncrypted
        )
          pending.push(`SUPERPDP_REVIEW:${company.id}`);
        const [paymentLinks, transmissions] = await Promise.all([
          this.prisma.invoicePaymentLink.count({
            where: { invoice: { companyId: company.id }, linkStatus: 'VALID' },
          }),
          this.prisma.electronicInvoiceTransmission.count({
            where: {
              document: { companyId: company.id },
              status: {
                in: ['PENDING', 'SUBMITTING', 'SUBMITTED', 'SENT', 'ON_HOLD'],
              },
            },
          }),
        ]);
        if (paymentLinks) pending.push(`PAYMENT_LINK_REVIEW:${company.id}`);
        if (transmissions)
          pending.push(`TRANSMISSION_SETTLEMENT:${company.id}`);
      }

      await this.sendClosureNotices(companies.map((company) => company.id));
      const undelivered = await this.prisma.appNotification.count({
        where: {
          companyId: { in: companies.map((company) => company.id) },
          type: 'COMPANY_CLOSED',
          emailSentAt: null,
          user: { closedAt: null },
        },
      });
      if (undelivered) pending.push('NOTIFICATIONS');
      const remaining = pending.filter(
        (action) => !closure.reviewedActions.includes(action),
      );
      const status: AccountClosureStatus = remaining.length
        ? remaining.some(
            (action) => action.includes('REVIEW') || action.includes('STRIPE'),
          )
          ? 'ACTION_REQUIRED'
          : 'WAITING_SETTLEMENT'
        : 'COMPLETED';
      if (status === 'COMPLETED') {
        await this.prisma.user.updateMany({
          where: {
            id: userId,
            closedAt: { not: null },
            profileMinimizedAt: null,
          },
          data: {
            firstname: 'Compte',
            lastname: 'clôturé',
            email: `closed-${userId}@onetto.invalid`,
            profileMinimizedAt: new Date(),
          },
        });
        await this.prisma.appNotification.deleteMany({ where: { userId } });
      }
      await this.prisma.accountClosure.update({
        where: { userId },
        data: {
          status,
          pendingActions: remaining,
          lastError: errorCode,
          nextAttemptAt:
            status === 'COMPLETED' ? null : new Date(Date.now() + 60 * 60_000),
          completedAt: status === 'COMPLETED' ? new Date() : null,
        },
      });
    } catch (error) {
      await this.prisma.accountClosure.update({
        where: { userId },
        data: {
          status: 'ACTION_REQUIRED',
          lastError:
            error instanceof Stripe.errors.StripeError
              ? 'STRIPE_ERROR'
              : 'PROCESSING_ERROR',
          nextAttemptAt: new Date(Date.now() + 60 * 60_000),
        },
      });
      throw error;
    } finally {
      await this.prisma.accountClosure.update({
        where: { userId },
        data: { processingAt: null },
      });
    }
  }

  private async sendClosureNotices(companyIds: string[]) {
    if (!companyIds.length) return;
    const notices = await this.prisma.appNotification.findMany({
      where: {
        companyId: { in: companyIds },
        type: 'COMPANY_CLOSED',
        emailSentAt: null,
      },
      include: { user: { select: { email: true, closedAt: true } } },
    });
    for (const notice of notices) {
      if (notice.user.closedAt) continue;
      try {
        await this.mail.sendMail({
          to: notice.user.email,
          subject: notice.title,
          text: notice.message,
        });
        await this.prisma.appNotification.update({
          where: { id: notice.id },
          data: { emailSentAt: new Date() },
        });
      } catch {
        this.logger.warn(`Avis de fermeture ${notice.id} à réessayer.`);
      }
    }
  }
}
