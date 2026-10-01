import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountType,
  CompanyStatus,
  CompanyUserRole,
  Prisma,
  SubscriptionPlan,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubscriptionWebhookService } from 'src/subscription/subscription-webhook.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { PlanAccessService } from 'src/plan-access/plan-access.service';
import { MailService } from 'src/mail/mail.service';
import { getPlanChangeType } from 'src/subscription/subscription-plan.utils';

const PAGE_SIZE = 25;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionWebhookService: SubscriptionWebhookService,
    private readonly subscriptionService: SubscriptionService,
    private readonly planAccessService: PlanAccessService,
    private readonly mail: MailService,
  ) {}

  async dashboard() {
    const [
      users,
      owners,
      employees,
      activeCompanies,
      subscriptions,
      failedPayments,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { accountType: AccountType.BUSINESS_OWNER },
      }),
      this.prisma.user.count({ where: { accountType: AccountType.EMPLOYEE } }),
      this.prisma.company.count({ where: { status: CompanyStatus.ACTIVE } }),
      this.prisma.userSubscription.groupBy({
        by: ['subscriptionPlan'],
        _count: true,
      }),
      this.prisma.payByBankPayment.count({ where: { status: 'FAILED' } }),
      this.prisma.user.findMany({
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          accountType: true,
        },
        orderBy: { id: 'desc' },
        take: 8,
      }),
    ]);

    return {
      users,
      owners,
      employees,
      activeCompanies,
      subscriptions,
      failedPayments,
      recentUsers,
    };
  }

  async users(params: {
    page?: number;
    query?: string;
    accountType?: AccountType;
    plan?: SubscriptionPlan;
    active?: boolean;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const query = params.query?.trim();
    const where: Prisma.UserWhereInput = {
      ...(query
        ? {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { firstname: { contains: query, mode: 'insensitive' } },
              { lastname: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(params.accountType ? { accountType: params.accountType } : {}),
      ...(params.plan || params.active !== undefined
        ? {
            subscription: {
              is: {
                ...(params.plan ? { subscriptionPlan: params.plan } : {}),
                ...(params.active !== undefined
                  ? { isActive: params.active }
                  : {}),
              },
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          accountType: true,
          isAdmin: true,
          bannedAt: true,
          subscription: {
            select: { subscriptionPlan: true, isActive: true },
          },
          _count: { select: { ownedCompanies: true } },
        },
        orderBy: { email: 'asc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    return this.paginate(items, total, page);
  }

  async user(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        bannedAt: true,
        email: true,
        emailVerifiedAt: true,
        accountType: true,
        isAdmin: true,
        lastConnectedCompany: { select: { id: true, name: true } },
        subscription: {
          select: {
            subscriptionPlan: true,
            isActive: true,
            customerId: true,
            subscriptionId: true,
            pendingSubscriptionPlan: true,
            pendingPlanEffectiveAt: true,
            canceledAtPeriodEnd: true,
          },
        },
        subscriptionHistory: {
          select: { subscriptionPlan: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        ownedCompanies: { select: { id: true, name: true, status: true } },
        companies: {
          select: {
            id: true,
            role: true,
            isHidden: true,
            company: { select: { id: true, name: true, status: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    return user;
  }

  async updateUser(
    adminUserId: string,
    userId: string,
    data: {
      firstname?: string;
      lastname?: string;
      email?: string;
      accountType?: AccountType;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        accountType: true,
        _count: { select: { ownedCompanies: true, companies: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    if (
      data.accountType === AccountType.EMPLOYEE &&
      user._count.ownedCompanies
    ) {
      throw new BadRequestException(
        'Un propriétaire possédant une entreprise ne peut pas devenir employé.',
      );
    }
    if (
      data.accountType === AccountType.BUSINESS_OWNER &&
      user._count.companies
    ) {
      throw new BadRequestException(
        'Un collaborateur doit être retiré de ses entreprises avant de devenir propriétaire.',
      );
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.firstname !== undefined
            ? { firstname: data.firstname.trim() }
            : {}),
          ...(data.lastname !== undefined
            ? { lastname: data.lastname.trim() }
            : {}),
          ...(data.email !== undefined
            ? { email: data.email.trim().toLowerCase() }
            : {}),
          ...(data.accountType !== undefined
            ? { accountType: data.accountType }
            : {}),
        },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          accountType: true,
        },
      });
      await this.audit(adminUserId, 'ADMIN_UPDATED_USER', 'User', userId, data);
      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Cette adresse e-mail est déjà utilisée.');
      }
      throw error;
    }
  }

  async setUserBanState(adminUserId: string, userId: string, ban: boolean) {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: userId },
        select: { id: true, isAdmin: true, bannedAt: true },
      });

      if (!user) {
        throw new NotFoundException('Utilisateur introuvable.');
      }
      if (user.isAdmin) {
        throw new ForbiddenException(
          'Un administrateur ne peut pas être banni.',
        );
      }
      if (Boolean(user.bannedAt) === ban) {
        return user;
      }

      const updated = await transaction.user.update({
        where: { id: userId, isAdmin: false },
        data: ban ? { bannedAt: new Date() } : { bannedAt: null },
        select: { id: true, isAdmin: true, bannedAt: true },
      });
      await transaction.adminAuditLog.create({
        data: {
          adminUserId,
          action: ban ? 'ADMIN_BANNED_USER' : 'ADMIN_UNBANNED_USER',
          targetType: 'User',
          targetId: userId,
        },
      });
      return updated;
    });
  }

  async companies(params: {
    page?: number;
    query?: string;
    status?: CompanyStatus;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const query = params.query?.trim();
    const where: Prisma.CompanyWhereInput = {
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { siren: { contains: query } },
              { siret: { contains: query } },
            ],
          }
        : {}),
      ...(params.status ? { status: params.status } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          siren: true,
          siret: true,
          subjectToVat: true,
          status: true,
          isPaymentAccountConnected: true,
          owner: {
            select: { id: true, firstname: true, lastname: true, email: true },
          },
          _count: {
            select: { clients: true, services: true, documents: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);
    return this.paginate(items, total, page);
  }

  async company(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        siren: true,
        siret: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        subjectToVat: true,
        vatNumber: true,
        status: true,
        closingReason: true,
        closedAt: true,
        isPaymentAccountConnected: true,
        owner: {
          select: { id: true, firstname: true, lastname: true, email: true },
        },
        companyUsers: {
          select: {
            id: true,
            role: true,
            isHidden: true,
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
                accountType: true,
              },
            },
          },
        },
        services: {
          select: {
            id: true,
            name: true,
            category: true,
            unitPrice: true,
            unit: true,
            taxRate: true,
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            documentNumber: true,
            clientName: true,
            totalPrice: true,
            invoiceStatus: true,
            estimateStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        companyPaymentAccount: {
          select: {
            provider: true,
            providerAccountId: true,
            creditorId: true,
            verificationStatus: true,
          },
        },
      },
    });
    if (!company) {
      throw new NotFoundException('Entreprise introuvable.');
    }
    return company;
  }

  async updateCompany(
    adminUserId: string,
    companyId: string,
    data: {
      name?: string;
      email?: string;
      phoneNumber?: string;
      address?: string;
      city?: string;
      postalCode?: string;
      country?: string;
      subjectToVat?: boolean;
      vatNumber?: string | null;
      status?: CompanyStatus;
      closingReason?: string | null;
    },
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) throw new NotFoundException('Entreprise introuvable.');
    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...data,
        ...(data.status === CompanyStatus.CLOSED
          ? { closedAt: new Date() }
          : data.status === CompanyStatus.ACTIVE
            ? { closedAt: null, closingReason: null }
            : {}),
      },
    });
    await this.audit(
      adminUserId,
      'ADMIN_UPDATED_COMPANY',
      'Company',
      companyId,
      data,
    );
    return updated;
  }

  async addCompanyUser(
    adminUserId: string,
    companyId: string,
    userId: string,
    role: CompanyUserRole,
  ) {
    const [company, user] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, ownerId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, accountType: true },
      }),
    ]);
    if (!company) throw new NotFoundException('Entreprise introuvable.');
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    if (
      company.ownerId === userId ||
      user.accountType !== AccountType.EMPLOYEE
    ) {
      throw new BadRequestException(
        'Seuls les comptes employés peuvent être ajoutés comme collaborateurs.',
      );
    }
    const collaborator = await this.prisma.companyUser.create({
      data: { companyId, userId, role },
    });
    await this.audit(
      adminUserId,
      'ADMIN_CHANGED_COMPANY_ROLE',
      'CompanyUser',
      collaborator.id,
      { companyId, userId, role },
    );
    return collaborator;
  }

  async updateCompanyUser(
    adminUserId: string,
    collaboratorId: string,
    role: CompanyUserRole,
    isHidden?: boolean,
  ) {
    const collaborator = await this.prisma.companyUser.update({
      where: { id: collaboratorId },
      data: { role, ...(isHidden !== undefined ? { isHidden } : {}) },
    });
    await this.audit(
      adminUserId,
      'ADMIN_CHANGED_COMPANY_ROLE',
      'CompanyUser',
      collaboratorId,
      { role, isHidden },
    );
    return collaborator;
  }

  async removeCompanyUser(adminUserId: string, collaboratorId: string) {
    const collaborator = await this.prisma.companyUser.delete({
      where: { id: collaboratorId },
    });
    await this.audit(
      adminUserId,
      'ADMIN_REMOVED_COMPANY_USER',
      'CompanyUser',
      collaboratorId,
      { companyId: collaborator.companyId },
    );
    return { success: true };
  }

  async services(params: {
    page?: number;
    query?: string;
    companyId?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const query = params.query?.trim();
    const where: Prisma.CompanyServiceWhereInput = {
      ...(params.companyId ? { companyId: params.companyId } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { category: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.companyService.count({ where }),
      this.prisma.companyService.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          unitPrice: true,
          unit: true,
          taxRate: true,
          company: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);
    return this.paginate(items, total, page);
  }

  async subscriptions(params: { page?: number; plan?: SubscriptionPlan }) {
    const page = Math.max(1, params.page ?? 1);
    const where = params.plan ? { subscriptionPlan: params.plan } : {};
    const [total, items] = await Promise.all([
      this.prisma.userSubscription.count({ where }),
      this.prisma.userSubscription.findMany({
        where,
        select: {
          userId: true,
          subscriptionPlan: true,
          isActive: true,
          customerId: true,
          subscriptionId: true,
          pendingSubscriptionPlan: true,
          pendingPlanEffectiveAt: true,
          canceledAtPeriodEnd: true,
          user: { select: { firstname: true, lastname: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);
    return this.paginate(items, total, page);
  }

  async changeUserSubscription(
    adminUserId: string,
    userId: string,
    targetPlan: SubscriptionPlan,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstname: true,
        email: true,
        accountType: true,
        subscriptionPlan: true,
        subscription: {
          select: {
            subscriptionId: true,
            subscriptionPlan: true,
            isActive: true,
            pendingSubscriptionPlan: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    if (user.accountType !== AccountType.BUSINESS_OWNER) {
      throw new BadRequestException(
        'Les collaborateurs ne possèdent pas d’abonnement personnel.',
      );
    }
    if (user.subscription?.pendingSubscriptionPlan) {
      throw new BadRequestException(
        'Un changement d’offre est déjà programmé pour cet utilisateur.',
      );
    }

    const previousPlan =
      user.subscription?.subscriptionPlan ??
      user.subscriptionPlan ??
      SubscriptionPlan.FREE;
    if (
      targetPlan === SubscriptionPlan.FREE &&
      (!user.subscription?.subscriptionId || !user.subscription.isActive)
    ) {
      await this.planAccessService.assertCanSchedulePlanChange(
        userId,
        targetPlan,
      );
      const result = await this.prisma.$transaction(async (transaction) => {
        if (
          previousPlan === SubscriptionPlan.FREE &&
          user.subscriptionPlan === SubscriptionPlan.FREE &&
          (!user.subscription ||
            (user.subscription.isActive && !user.subscription.subscriptionId))
        ) {
          return { unchanged: true };
        }
        await transaction.userSubscription.upsert({
          where: { userId },
          create: {
            userId,
            subscriptionPlan: SubscriptionPlan.FREE,
            isActive: true,
          },
          update: {
            subscriptionPlan: SubscriptionPlan.FREE,
            isActive: true,
            subscriptionId: null,
            pendingSubscriptionPlan: null,
            pendingPlanEffectiveAt: null,
            pendingStripeScheduleId: null,
          },
        });
        await transaction.user.update({
          where: { id: userId },
          data: { subscriptionPlan: SubscriptionPlan.FREE },
        });
        await transaction.userSubscriptionHistory.create({
          data: { userId, subscriptionPlan: SubscriptionPlan.FREE },
        });
        await transaction.adminAuditLog.create({
          data: {
            adminUserId,
            action: 'ADMIN_CHANGED_SUBSCRIPTION',
            targetType: 'UserSubscription',
            targetId: userId,
            metadata: { previousPlan, targetPlan },
          },
        });
        return { applied: true };
      });
      if ('unchanged' in result) {
        return result;
      }
      const emailSent = await this.sendSubscriptionMail(
        user.email,
        this.mail.createAdminPlanChangeMail({
          firstname: user.firstname,
          targetPlan,
          effectiveAt: null,
        }),
      );
      return { ...result, emailSent };
    }

    const isStripeActive = Boolean(
      user.subscription?.subscriptionId && user.subscription.isActive,
    );
    const changeType = getPlanChangeType(previousPlan, targetPlan);
    const upgrade =
      isStripeActive && changeType === 'UPGRADE'
        ? await this.prisma.adminSubscriptionUpgrade.create({
            data: {
              userId,
              stripeSubscriptionId: user.subscription!.subscriptionId!,
              previousPlan,
              targetPlan,
            },
            select: { id: true },
          })
        : null;

    const result = await this.subscriptionService.changePlanForAdmin(
      userId,
      targetPlan,
    );
    if (upgrade && 'stripeInvoiceId' in result && result.stripeInvoiceId) {
      await this.prisma.adminSubscriptionUpgrade.update({
        where: { id: upgrade.id },
        data: { stripeInvoiceId: result.stripeInvoiceId },
      });
    }
    await this.audit(
      adminUserId,
      'ADMIN_REQUESTED_SUBSCRIPTION_CHANGE',
      'UserSubscription',
      userId,
      { previousPlan, targetPlan },
    );

    if ('url' in result) {
      if (!result.url) {
        throw new BadRequestException(
          'Le lien de paiement Stripe est indisponible.',
        );
      }
      const emailSent = await this.sendSubscriptionMail(
        user.email,
        this.mail.createAdminCheckoutMail({
          firstname: user.firstname,
          targetPlan,
          checkoutUrl: result.url,
        }),
      );
      return { checkoutCreated: true, emailSent };
    }
    if ('scheduled' in result && result.scheduled) {
      const emailSent = await this.sendSubscriptionMail(
        user.email,
        this.mail.createAdminPlanChangeMail({
          firstname: user.firstname,
          targetPlan,
          effectiveAt: result.effectiveAt,
        }),
      );
      return { ...result, emailSent };
    }
    return result;
  }

  private async sendSubscriptionMail(
    to: string,
    content: { subject: string; text: string; html?: string },
  ): Promise<boolean> {
    try {
      await this.mail.sendMail({ to, ...content });
      return true;
    } catch (error) {
      this.logger.error(
        `Impossible d’envoyer le mail d’abonnement à ${to}.`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  async cancelPendingSubscriptionChange(adminUserId: string, userId: string) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
      select: { pendingSubscriptionPlan: true },
    });
    if (!subscription?.pendingSubscriptionPlan) {
      throw new BadRequestException(
        'Aucun changement d’offre programmé pour cet utilisateur.',
      );
    }

    const result =
      await this.subscriptionService.cancelPendingPlanChange(userId);
    await this.audit(
      adminUserId,
      'ADMIN_CANCELED_SUBSCRIPTION_CHANGE',
      'UserSubscription',
      userId,
      { pendingPlan: subscription.pendingSubscriptionPlan },
    );
    return result;
  }

  async resyncSubscription(adminUserId: string, userId: string) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
      select: { subscriptionId: true },
    });
    if (!subscription?.subscriptionId) {
      throw new BadRequestException(
        'Cet utilisateur ne possède pas de souscription Stripe à resynchroniser.',
      );
    }
    await this.subscriptionWebhookService.syncSubscription(
      subscription.subscriptionId,
    );
    await this.audit(
      adminUserId,
      'ADMIN_RESYNCED_STRIPE',
      'UserSubscription',
      userId,
      {},
    );
    return { success: true };
  }

  async payments(params: { page?: number; query?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const query = params.query?.trim();
    const where: Prisma.PayByBankPaymentWhereInput = query
      ? {
          OR: [
            { providerReference: { contains: query } },
            {
              invoice: {
                is: {
                  documentNumber: { contains: query, mode: 'insensitive' },
                },
              },
            },
          ],
        }
      : {};
    const [total, items] = await Promise.all([
      this.prisma.payByBankPayment.count({ where }),
      this.prisma.payByBankPayment.findMany({
        where,
        select: {
          id: true,
          amountInCents: true,
          provider: true,
          providerReference: true,
          status: true,
          createdAt: true,
          invoice: {
            select: {
              id: true,
              documentNumber: true,
              company: { select: { id: true, name: true } },
            },
          },
          payByBankPaymentAttempts: {
            select: {
              providerPaymentId: true,
              failureReason: true,
              paymentStatus: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);
    return this.paginate(items, total, page);
  }

  async system() {
    const [paymentWebhooks, stripeWebhooks, audits] = await Promise.all([
      this.prisma.processedWebhookEvents.findMany({
        orderBy: { processedAt: 'desc' },
        take: 50,
      }),
      this.prisma.processedStripeWebhookEvents.findMany({
        orderBy: { processedAt: 'desc' },
        take: 50,
      }),
      this.prisma.adminAuditLog.findMany({
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          createdAt: true,
          adminUser: { select: { email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    return { paymentWebhooks, stripeWebhooks, audits };
  }

  async search(query: string) {
    const value = query.trim();
    if (value.length < 2)
      return { users: [], companies: [], documents: [], payments: [] };
    const [users, companies, documents, payments] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: value, mode: 'insensitive' } },
            { firstname: { contains: value, mode: 'insensitive' } },
            { lastname: { contains: value, mode: 'insensitive' } },
          ],
        },
        select: { id: true, firstname: true, lastname: true, email: true },
        take: 8,
      }),
      this.prisma.company.findMany({
        where: {
          OR: [
            { name: { contains: value, mode: 'insensitive' } },
            { siren: { contains: value } },
            { siret: { contains: value } },
          ],
        },
        select: { id: true, name: true, siren: true },
        take: 8,
      }),
      this.prisma.document.findMany({
        where: { documentNumber: { contains: value, mode: 'insensitive' } },
        select: {
          id: true,
          documentNumber: true,
          type: true,
          company: { select: { name: true } },
        },
        take: 8,
      }),
      this.prisma.payByBankPayment.findMany({
        where: {
          OR: [
            { providerReference: { contains: value } },
            {
              payByBankPaymentAttempts: {
                some: { providerPaymentId: { contains: value } },
              },
            },
          ],
        },
        select: { id: true, providerReference: true, status: true },
        take: 8,
      }),
    ]);
    return { users, companies, documents, payments };
  }

  private paginate<T>(items: T[], total: number, page: number) {
    return {
      items,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
    };
  }

  private async audit(
    adminUserId: string,
    action: string,
    targetType: string,
    targetId: string,
    metadata: unknown,
  ) {
    await this.prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action,
        targetType,
        targetId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
