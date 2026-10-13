import { BadRequestException, ConflictException } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { AdminService } from './admin.service';

describe('AdminService — invitations', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    adminUserInvitation: { upsert: jest.fn() },
    adminAuditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const mail = {
    createAdminUserInvitationMail: jest.fn(
      (input: {
        email: string;
        plan: SubscriptionPlan;
        discountPercent: number;
        invitationUrl: string;
      }) => ({
        subject: 'Invitation Onetto',
        text: `Bienvenue ${input.email}`,
      }),
    ),
    sendMail: jest.fn(),
  };
  const service = new AdminService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    mail as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.adminUserInvitation.upsert.mockResolvedValue({ id: 'inv-1' });
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma),
    );
    mail.sendMail.mockResolvedValue(undefined);
  });

  it('refuse une remise incompatible avec une offre gratuite ou payante', async () => {
    await expect(
      service.inviteUser('admin-1', {
        email: 'ada@example.test',
        subscriptionPlan: SubscriptionPlan.FREE,
        discountPercent: 5,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.inviteUser('admin-1', {
        email: 'ada@example.test',
        subscriptionPlan: SubscriptionPlan.STARTER_MONTHLY,
        discountPercent: 0,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.inviteUser('admin-1', {
        email: 'ada@example.test',
        subscriptionPlan: SubscriptionPlan.PRO_MONTHLY,
        discountPercent: 42,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mail.sendMail).not.toHaveBeenCalled();
  });

  it.each([
    [SubscriptionPlan.FREE, 0],
    [SubscriptionPlan.STARTER_MONTHLY, 5],
    [SubscriptionPlan.STARTER_YEARLY, 40],
  ])(
    'invite un utilisateur vers %s avec %i %% de remise',
    async (plan, discountPercent) => {
      await expect(
        service.inviteUser('admin-1', {
          email: 'ada@example.test',
          subscriptionPlan: plan,
          discountPercent,
        }),
      ).resolves.toEqual({ invited: true, emailSent: true });

      const upsertCalls = prisma.adminUserInvitation.upsert.mock.calls as Array<
        [
          {
            create: {
              subscriptionPlan: SubscriptionPlan;
              discountPercent: number;
            };
          },
        ]
      >;
      expect(upsertCalls[0][0].create.subscriptionPlan).toBe(plan);
      expect(upsertCalls[0][0].create.discountPercent).toBe(discountPercent);
    },
  );

  it('refuse une adresse déjà inscrite', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.inviteUser('admin-1', {
        email: 'ada@example.test',
        subscriptionPlan: SubscriptionPlan.PRO_YEARLY,
        discountPercent: 25,
      }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.adminUserInvitation.upsert).not.toHaveBeenCalled();
  });

  it('enregistre une invitation liée à l’adresse et envoie le lien par mail', async () => {
    await expect(
      service.inviteUser('admin-1', {
        email: ' ADA@Example.Test ',
        subscriptionPlan: SubscriptionPlan.PRO_YEARLY,
        discountPercent: 40,
      }),
    ).resolves.toEqual({ invited: true, emailSent: true });

    const upsertCalls = prisma.adminUserInvitation.upsert.mock.calls as Array<
      [
        {
          where: { email: string };
          create: {
            email: string;
            subscriptionPlan: SubscriptionPlan;
            discountPercent: number;
            invitedById: string;
            tokenHash: string;
          };
          update: {
            subscriptionPlan: SubscriptionPlan;
            discountPercent: number;
          };
        },
      ]
    >;
    const upsertInput = upsertCalls[0][0];
    expect(upsertInput.where.email).toBe('ada@example.test');
    expect(upsertInput.create).toMatchObject({
      email: 'ada@example.test',
      subscriptionPlan: SubscriptionPlan.PRO_YEARLY,
      discountPercent: 40,
      invitedById: 'admin-1',
    });
    expect(upsertInput.create.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(upsertInput.update.subscriptionPlan).toBe(
      SubscriptionPlan.PRO_YEARLY,
    );
    expect(upsertInput.update.discountPercent).toBe(40);
    const mailInput = mail.createAdminUserInvitationMail.mock.calls[0][0];
    expect(mailInput.email).toBe('ada@example.test');
    expect(mailInput.plan).toBe(SubscriptionPlan.PRO_YEARLY);
    expect(mailInput.discountPercent).toBe(40);
    expect(mailInput.invitationUrl).toContain('/auth/register?invitation=');
    expect(mail.sendMail).toHaveBeenCalledWith({
      to: 'ada@example.test',
      subject: 'Invitation Onetto',
      text: 'Bienvenue ada@example.test',
    });
  });
});
