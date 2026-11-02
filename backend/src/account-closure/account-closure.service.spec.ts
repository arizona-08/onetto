/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method -- Jest matchers and mock call inspection are dynamically typed. */
jest.mock('argon2', () => ({
  __esModule: true,
  default: {
    verify: jest.fn().mockResolvedValue(true),
    hash: jest.fn().mockResolvedValue('hash-inutilisable'),
  },
}));

import Stripe from 'stripe';
import { AccountClosureService } from './account-closure.service';

describe('AccountClosureService', () => {
  const tx = {
    user: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    accountClosure: { create: jest.fn() },
    company: { findMany: jest.fn() },
    invoicePaymentLink: { count: jest.fn() },
    electronicInvoiceTransmission: { count: jest.fn() },
    appNotification: { createMany: jest.fn() },
    companyPaymentOAuthState: { deleteMany: jest.fn() },
    electronicInvoicingOAuthState: { deleteMany: jest.fn() },
    electronicInvoicingConnection: { updateMany: jest.fn() },
    companyUser: { deleteMany: jest.fn() },
  };
  const prisma = {
    user: { findUnique: jest.fn(), updateMany: jest.fn() },
    accountClosure: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    userSubscription: { findUnique: jest.fn() },
    company: { findMany: jest.fn() },
    payByBankPayment: { count: jest.fn() },
    invoicePaymentInstalment: { count: jest.fn() },
    invoicePaymentLink: { count: jest.fn() },
    electronicInvoiceTransmission: { count: jest.fn() },
    appNotification: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const companies = { closeCompany: jest.fn() };
  const mail = { sendMail: jest.fn() };
  const service = new AccountClosureService(
    prisma as never,
    companies as never,
    mail as never,
    { getOrThrow: () => 'sk_test_example' } as never,
  );
  const stripe = Reflect.get(service, 'stripe') as Stripe;
  const retrieve = jest.spyOn(stripe.subscriptions, 'retrieve');
  const update = jest.spyOn(stripe.subscriptions, 'update');

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      password: 'old-hash',
      closedAt: null,
    });
    prisma.accountClosure.findUnique.mockResolvedValue(null);
    prisma.accountClosure.findUniqueOrThrow.mockResolvedValue({
      reviewedActions: [],
    });
    tx.user.updateMany.mockResolvedValue({ count: 1 });
    tx.company.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
    prisma.accountClosure.updateMany.mockResolvedValue({ count: 1 });
    prisma.userSubscription.findUnique.mockResolvedValue(null);
    prisma.company.findMany.mockResolvedValue([]);
    prisma.payByBankPayment.count.mockResolvedValue(0);
    prisma.invoicePaymentInstalment.count.mockResolvedValue(0);
    prisma.invoicePaymentLink.count.mockResolvedValue(0);
    prisma.electronicInvoiceTransmission.count.mockResolvedValue(0);
    prisma.appNotification.findMany.mockResolvedValue([]);
    prisma.appNotification.count.mockResolvedValue(0);
    jest.spyOn(service, 'process').mockResolvedValue(undefined);
  });

  afterAll(() => {
    retrieve.mockRestore();
    update.mockRestore();
  });

  it('ferme une entreprise et révoque les tokens du compte en une transaction', async () => {
    tx.company.findMany.mockResolvedValue([
      { id: 'c1', name: 'Atelier', companyUsers: [{ userId: 'u1' }] },
    ]);
    await service.close('u1', 'password');
    expect(companies.closeCompany).toHaveBeenCalledWith(
      tx,
      'c1',
      expect.any(String),
      expect.any(Date),
      true,
    );
    expect(tx.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1', closedAt: null, password: 'old-hash' },
        data: expect.objectContaining({
          closedAt: expect.any(Date),
          passwordResetTokenHash: null,
          emailVerificationTokenHash: null,
        }),
      }),
    );
    expect(tx.accountClosure.create).toHaveBeenCalledTimes(1);
  });

  it('ferme toutes les entreprises détenues mais pas celles où le compte est seulement collaborateur', async () => {
    tx.company.findMany.mockResolvedValue([
      { id: 'c1', name: 'A', companyUsers: [] },
      { id: 'c2', name: 'B', companyUsers: [] },
    ]);
    await service.close('u1', 'password');
    expect(companies.closeCompany).toHaveBeenCalledTimes(2);
    expect(tx.companyUser.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', companyId: { notIn: ['c1', 'c2'] } },
    });
  });

  it('conserve les memberships des entreprises fermées et avertit tous les autres collaborateurs', async () => {
    tx.company.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'Atelier',
        companyUsers: [
          { userId: 'u1' },
          { userId: 'u2' },
          { userId: 'u3' },
          { userId: 'u2' },
        ],
      },
    ]);
    await service.close('u1', 'password');
    expect(tx.appNotification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'u2', type: 'COMPANY_CLOSED' }),
          expect.objectContaining({ userId: 'u3', type: 'COMPANY_CLOSED' }),
        ]),
      }),
    );
    expect(tx.appNotification.createMany.mock.calls[0][0].data).toHaveLength(2);
    expect(tx.companyUser.deleteMany).not.toHaveBeenCalledWith({
      where: { companyId: 'c1' },
    });
  });

  it('ne crée pas une seconde procédure pour un compte déjà clôturé', async () => {
    prisma.user.findUnique.mockResolvedValue({
      closedAt: new Date(),
      password: 'hash',
    });
    await expect(service.close('u1', 'password')).resolves.toEqual({
      closed: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('résiste à deux demandes concurrentes grâce à la réclamation conditionnelle', async () => {
    prisma.accountClosure.findUnique.mockResolvedValue({ userId: 'u1' });
    tx.user.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    await Promise.all([
      service.close('u1', 'password'),
      service.close('u1', 'password'),
    ]);
    expect(tx.accountClosure.create).toHaveBeenCalledTimes(1);
  });

  it('ne déclenche pas de traitement externe si la transaction échoue', async () => {
    tx.company.findMany.mockRejectedValueOnce(new Error('database failed'));
    await expect(service.close('u1', 'password')).rejects.toThrow(
      'database failed',
    );
    expect(service.process).not.toHaveBeenCalled();
  });

  it('laisse Stripe arrêter le renouvellement puis vérifie son état', async () => {
    jest.spyOn(service, 'process').mockRestore();
    prisma.userSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub_1',
      pendingStripeScheduleId: null,
    });
    retrieve
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        cancel_at_period_end: false,
      } as never)
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        cancel_at_period_end: true,
      } as never);
    update.mockResolvedValue({} as never);
    await service.process('u1');
    expect(update).toHaveBeenCalledWith(
      'sub_1',
      { cancel_at_period_end: true },
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
    expect(prisma.accountClosure.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('garde une action Stripe à reprendre après un échec réseau', async () => {
    jest.spyOn(service, 'process').mockRestore();
    prisma.userSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub_1',
      pendingStripeScheduleId: null,
    });
    retrieve.mockRejectedValueOnce(new Error('network'));
    await service.process('u1');
    expect(prisma.accountClosure.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ACTION_REQUIRED',
          pendingActions: ['STRIPE_CANCELLATION'],
        }),
      }),
    );
  });

  it('reprend une annulation Stripe après un échec transitoire', async () => {
    jest.spyOn(service, 'process').mockRestore();
    prisma.userSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub_1',
      pendingStripeScheduleId: null,
    });
    retrieve
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        cancel_at_period_end: true,
      } as never)
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        cancel_at_period_end: true,
      } as never);
    await service.process('u1');
    await service.process('u1');
    expect(prisma.accountClosure.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('signale les intégrations et les paiements en cours sans prétendre les révoquer', async () => {
    jest.spyOn(service, 'process').mockRestore();
    prisma.company.findMany.mockResolvedValue([
      {
        id: 'c1',
        companyPaymentAccount: { id: 'g1' },
        electronicInvoicingConnection: {
          accessTokenEncrypted: 'secret',
          refreshTokenEncrypted: 'secret',
        },
      },
    ]);
    prisma.payByBankPayment.count.mockResolvedValue(1);
    await service.process('u1');
    expect(prisma.accountClosure.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pendingActions: expect.arrayContaining([
            'PAYMENT_SETTLEMENT:c1',
            'GOCARDLESS_REVIEW:c1',
            'SUPERPDP_REVIEW:c1',
          ]),
        }),
      }),
    );
  });

  it('permet de confirmer une revue manuelle après vérification externe', async () => {
    prisma.accountClosure.findUnique.mockResolvedValue({
      pendingActions: ['GOCARDLESS_REVIEW:c1'],
      reviewedActions: [],
    });
    await service.acknowledgeReview('u1', 'GOCARDLESS_REVIEW:c1');
    expect(prisma.accountClosure.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: {
        reviewedActions: { push: 'GOCARDLESS_REVIEW:c1' },
        nextAttemptAt: expect.any(Date),
      },
    });
    expect(service.process).toHaveBeenCalledWith('u1');
  });

  it('ne redemande pas une revue manuelle déjà confirmée', async () => {
    jest.spyOn(service, 'process').mockRestore();
    prisma.accountClosure.findUniqueOrThrow.mockResolvedValue({
      reviewedActions: ['GOCARDLESS_REVIEW:c1'],
    });
    prisma.company.findMany.mockResolvedValue([
      {
        id: 'c1',
        companyPaymentAccount: { id: 'g1' },
        electronicInvoicingConnection: null,
      },
    ]);
    await service.process('u1');
    expect(prisma.accountClosure.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          pendingActions: [],
        }),
      }),
    );
  });
});
