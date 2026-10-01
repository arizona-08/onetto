import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { AdminService } from './admin.service';

describe('AdminService — bannissement', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    adminAuditLog: {
      create: jest.fn(),
    },
    userSubscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    userSubscriptionHistory: {
      create: jest.fn(),
    },
  };
  const subscriptionService = {
    changePlanForAdmin: jest.fn(),
    cancelPendingPlanChange: jest.fn(),
  };
  const planAccessService = {
    assertCanSchedulePlanChange: jest.fn(),
  };
  const transaction = jest.fn(
    (callback: (client: typeof prisma) => Promise<unknown>) => callback(prisma),
  );
  const service = new AdminService(
    { ...prisma, $transaction: transaction } as never,
    {} as never,
    subscriptionService as never,
    planAccessService as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuse le bannissement d’un administrateur', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-2',
      isAdmin: true,
      bannedAt: null,
    });

    await expect(
      service.setUserBanState('admin-1', 'admin-2', true),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('bannit un utilisateur et journalise l’action', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      isAdmin: false,
      bannedAt: null,
    });
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      isAdmin: false,
      bannedAt: new Date(),
    });

    await service.setUserBanState('admin-1', 'user-1', true);

    const updateCalls = prisma.user.update.mock.calls as Array<
      [{ data: { bannedAt: Date } }]
    >;
    const updateCall = updateCalls[0][0];
    expect(updateCall.data.bannedAt).toBeInstanceOf(Date);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1', isAdmin: false },
      data: { bannedAt: updateCall.data.bannedAt },
      select: { id: true, isAdmin: true, bannedAt: true },
    });
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        adminUserId: 'admin-1',
        action: 'ADMIN_BANNED_USER',
        targetType: 'User',
        targetId: 'user-1',
      },
    });
  });

  it('débannit un utilisateur', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      isAdmin: false,
      bannedAt: new Date(),
    });
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      isAdmin: false,
      bannedAt: null,
    });

    await service.setUserBanState('admin-1', 'user-1', false);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1', isAdmin: false },
      data: { bannedAt: null },
      select: { id: true, isAdmin: true, bannedAt: true },
    });
  });

  it('retourne une erreur pour un utilisateur inconnu', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.setUserBanState('admin-1', 'missing', true),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('AdminService — changement d’abonnement', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userSubscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    userSubscriptionHistory: {
      create: jest.fn(),
    },
    adminAuditLog: {
      create: jest.fn(),
    },
    adminSubscriptionUpgrade: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const subscriptionService = {
    changePlanForAdmin: jest.fn(),
    cancelPendingPlanChange: jest.fn(),
  };
  const planAccessService = {
    assertCanSchedulePlanChange: jest.fn(),
  };
  const mail = {
    sendMail: jest.fn(),
    createAdminCheckoutMail: jest.fn(() => ({
      subject: 'Checkout',
      text: 'Lien de paiement',
    })),
    createAdminPlanChangeMail: jest.fn(() => ({
      subject: 'Changement d’offre',
      text: 'Votre offre évolue',
    })),
  };
  const transaction = jest.fn(
    (callback: (client: typeof prisma) => Promise<unknown>) => callback(prisma),
  );
  const service = new AdminService(
    { ...prisma, $transaction: transaction } as never,
    {} as never,
    subscriptionService as never,
    planAccessService as never,
    mail as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mail.sendMail.mockResolvedValue(undefined);
    prisma.adminSubscriptionUpgrade.create.mockResolvedValue({
      id: 'upgrade-1',
    });
  });

  it('refuse un abonnement personnel à un collaborateur', async () => {
    prisma.user.findUnique.mockResolvedValue({
      accountType: 'EMPLOYEE',
      subscriptionPlan: null,
      subscription: null,
    });

    await expect(
      service.changeUserSubscription(
        'admin-1',
        'employee-1',
        SubscriptionPlan.PRO_MONTHLY,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(subscriptionService.changePlanForAdmin).not.toHaveBeenCalled();
  });

  it('ne crée pas de suivi d’upgrade si un changement est déjà programmé', async () => {
    prisma.user.findUnique.mockResolvedValue({
      firstname: 'Ada',
      email: 'ada@example.test',
      accountType: 'BUSINESS_OWNER',
      subscriptionPlan: SubscriptionPlan.STARTER_MONTHLY,
      subscription: {
        subscriptionId: 'sub_123',
        subscriptionPlan: SubscriptionPlan.STARTER_MONTHLY,
        isActive: true,
        pendingSubscriptionPlan: SubscriptionPlan.FREE,
      },
    });

    await expect(
      service.changeUserSubscription(
        'admin-1',
        'user-1',
        SubscriptionPlan.PRO_MONTHLY,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.adminSubscriptionUpgrade.create).not.toHaveBeenCalled();
  });

  it('transmet un changement payant à Stripe et journalise la demande', async () => {
    prisma.user.findUnique.mockResolvedValue({
      firstname: 'Ada',
      email: 'ada@example.test',
      accountType: 'BUSINESS_OWNER',
      subscriptionPlan: SubscriptionPlan.STARTER_MONTHLY,
      subscription: {
        subscriptionId: 'sub_123',
        subscriptionPlan: SubscriptionPlan.STARTER_MONTHLY,
        isActive: true,
      },
    });
    subscriptionService.changePlanForAdmin.mockResolvedValue({
      pendingPayment: true,
      stripeInvoiceId: 'in_123',
    });

    await expect(
      service.changeUserSubscription(
        'admin-1',
        'user-1',
        SubscriptionPlan.PRO_MONTHLY,
      ),
    ).resolves.toEqual({
      pendingPayment: true,
      stripeInvoiceId: 'in_123',
    });
    expect(prisma.adminSubscriptionUpgrade.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        stripeSubscriptionId: 'sub_123',
        previousPlan: SubscriptionPlan.STARTER_MONTHLY,
        targetPlan: SubscriptionPlan.PRO_MONTHLY,
      },
      select: { id: true },
    });
    expect(prisma.adminSubscriptionUpgrade.update).toHaveBeenCalledWith({
      where: { id: 'upgrade-1' },
      data: { stripeInvoiceId: 'in_123' },
    });
    expect(mail.sendMail).not.toHaveBeenCalled();
    expect(subscriptionService.changePlanForAdmin).toHaveBeenCalledWith(
      'user-1',
      SubscriptionPlan.PRO_MONTHLY,
    );
    expect(prisma.userSubscription.upsert).not.toHaveBeenCalled();
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        adminUserId: 'admin-1',
        action: 'ADMIN_REQUESTED_SUBSCRIPTION_CHANGE',
        targetType: 'UserSubscription',
        targetId: 'user-1',
        metadata: {
          previousPlan: SubscriptionPlan.STARTER_MONTHLY,
          targetPlan: SubscriptionPlan.PRO_MONTHLY,
        },
      },
    });
  });

  it('applique localement le gratuit en l’absence de souscription Stripe active', async () => {
    prisma.user.findUnique.mockResolvedValue({
      firstname: 'Ada',
      email: 'ada@example.test',
      accountType: 'BUSINESS_OWNER',
      subscriptionPlan: SubscriptionPlan.PRO_MONTHLY,
      subscription: {
        subscriptionId: null,
        subscriptionPlan: SubscriptionPlan.PRO_MONTHLY,
        isActive: true,
      },
    });

    await expect(
      service.changeUserSubscription(
        'admin-1',
        'user-1',
        SubscriptionPlan.FREE,
      ),
    ).resolves.toEqual({ applied: true, emailSent: true });
    expect(mail.createAdminPlanChangeMail).toHaveBeenCalledWith({
      firstname: 'Ada',
      targetPlan: SubscriptionPlan.FREE,
      effectiveAt: null,
    });
    expect(mail.sendMail).toHaveBeenCalledWith({
      to: 'ada@example.test',
      subject: 'Changement d’offre',
      text: 'Votre offre évolue',
    });
    expect(planAccessService.assertCanSchedulePlanChange).toHaveBeenCalledWith(
      'user-1',
      SubscriptionPlan.FREE,
    );
    expect(prisma.userSubscription.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: {
        userId: 'user-1',
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
    expect(prisma.userSubscriptionHistory.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        subscriptionPlan: SubscriptionPlan.FREE,
      },
    });
  });

  it('envoie le lien Checkout à l’utilisateur sans abonnement actif', async () => {
    prisma.user.findUnique.mockResolvedValue({
      firstname: 'Ada',
      email: 'ada@example.test',
      accountType: 'BUSINESS_OWNER',
      subscriptionPlan: SubscriptionPlan.FREE,
      subscription: null,
    });
    subscriptionService.changePlanForAdmin.mockResolvedValue({
      url: 'https://checkout.stripe.test/session',
    });

    await expect(
      service.changeUserSubscription(
        'admin-1',
        'user-1',
        SubscriptionPlan.PRO_MONTHLY,
      ),
    ).resolves.toEqual({
      checkoutCreated: true,
      emailSent: true,
    });
    expect(mail.createAdminCheckoutMail).toHaveBeenCalledWith({
      firstname: 'Ada',
      targetPlan: SubscriptionPlan.PRO_MONTHLY,
      checkoutUrl: 'https://checkout.stripe.test/session',
    });
    expect(mail.sendMail).toHaveBeenCalledWith({
      to: 'ada@example.test',
      subject: 'Checkout',
      text: 'Lien de paiement',
    });
  });

  it('informe l’utilisateur après programmation du downgrade', async () => {
    const effectiveAt = new Date('2026-11-01T00:00:00Z');
    prisma.user.findUnique.mockResolvedValue({
      firstname: 'Ada',
      email: 'ada@example.test',
      accountType: 'BUSINESS_OWNER',
      subscriptionPlan: SubscriptionPlan.PRO_MONTHLY,
      subscription: {
        subscriptionId: 'sub_123',
        subscriptionPlan: SubscriptionPlan.PRO_MONTHLY,
        isActive: true,
      },
    });
    subscriptionService.changePlanForAdmin.mockResolvedValue({
      scheduled: true,
      effectiveAt,
    });

    await expect(
      service.changeUserSubscription(
        'admin-1',
        'user-1',
        SubscriptionPlan.STARTER_MONTHLY,
      ),
    ).resolves.toEqual({ scheduled: true, effectiveAt, emailSent: true });
    expect(mail.createAdminPlanChangeMail).toHaveBeenCalledWith({
      firstname: 'Ada',
      targetPlan: SubscriptionPlan.STARTER_MONTHLY,
      effectiveAt,
    });
    expect(prisma.adminSubscriptionUpgrade.create).not.toHaveBeenCalled();
  });

  it('signale un échec SMTP sans masquer le changement Stripe', async () => {
    prisma.user.findUnique.mockResolvedValue({
      firstname: 'Ada',
      email: 'ada@example.test',
      accountType: 'BUSINESS_OWNER',
      subscriptionPlan: SubscriptionPlan.FREE,
      subscription: null,
    });
    subscriptionService.changePlanForAdmin.mockResolvedValue({
      url: 'https://checkout.stripe.test/session',
    });
    mail.sendMail.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(
      service.changeUserSubscription(
        'admin-1',
        'user-1',
        SubscriptionPlan.PRO_MONTHLY,
      ),
    ).resolves.toEqual({
      checkoutCreated: true,
      emailSent: false,
    });
  });
  it('annule un changement programmé dans Stripe', async () => {
    prisma.userSubscription.findUnique.mockResolvedValue({
      pendingSubscriptionPlan: SubscriptionPlan.FREE,
    });
    subscriptionService.cancelPendingPlanChange.mockResolvedValue({
      canceled: true,
    });

    await expect(
      service.cancelPendingSubscriptionChange('admin-1', 'user-1'),
    ).resolves.toEqual({ canceled: true });
    expect(subscriptionService.cancelPendingPlanChange).toHaveBeenCalledWith(
      'user-1',
    );
  });
});
