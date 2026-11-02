jest.mock('argon2', () => ({
  __esModule: true,
  default: { verify: jest.fn(), hash: jest.fn() },
}));

import argon2 from 'argon2';
import { BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';

describe('UserService', () => {
  const prisma = {
    user: {
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const mailService = {
    sendMail: jest.fn(),
    createEmailVerificationMail: jest.fn(),
  };
  const service = new UserService(prisma as never, mailService as never);

  beforeEach(() => jest.clearAllMocks());

  it('refuse un changement de mot de passe dont la confirmation diffère', async () => {
    await expect(
      service.changePassword('user-1', {
        currentPassword: 'ancien-mot-de-passe',
        newPassword: 'nouveau-mot-de-passe',
        confirmationPassword: 'autre-mot-de-passe',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('met à jour le mot de passe après validation du mot de passe actuel', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      password: 'hash-actuel',
    });
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    (argon2.hash as jest.Mock).mockResolvedValue('nouveau-hash');

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'ancien-mot-de-passe',
        newPassword: 'nouveau-mot-de-passe',
        confirmationPassword: 'nouveau-mot-de-passe',
      }),
    ).resolves.toEqual({ message: 'Mot de passe mis à jour.' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password: 'nouveau-hash' },
    });
  });

  it('confirme un jeton d’e-mail valide et le rend inutilisable', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      emailVerifiedAt: null,
    });

    await expect(service.confirmEmail('token-valide')).resolves.toEqual({
      message:
        'Votre adresse e-mail a été confirmée. Vous pouvez maintenant vous connecter.',
    });

    const findCalls = prisma.user.findFirst.mock.calls as Array<
      [
        {
          where: {
            emailVerificationTokenHash: string;
            emailVerificationExpiresAt: { gt: Date };
          };
        },
      ]
    >;
    const findInput = findCalls[0][0];
    expect(findInput.where.emailVerificationTokenHash).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(findInput.where.emailVerificationExpiresAt.gt).toBeInstanceOf(Date);
    const updateCalls = prisma.user.update.mock.calls as Array<
      [
        {
          where: { id: string };
          data: {
            emailVerifiedAt: Date;
            emailVerificationTokenHash: null;
            emailVerificationExpiresAt: null;
          };
        },
      ]
    >;
    const updateInput = updateCalls[0][0];
    expect(updateInput.where.id).toBe('user-1');
    expect(updateInput.data.emailVerifiedAt).toBeInstanceOf(Date);
    expect(updateInput.data.emailVerificationTokenHash).toBeNull();
    expect(updateInput.data.emailVerificationExpiresAt).toBeNull();
  });
});

describe('UserService — inscription sur invitation', () => {
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    userSubscription: { create: jest.fn() },
    adminUserInvitation: { findFirst: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const mail = {
    sendMail: jest.fn(),
    createEmailVerificationMail: jest.fn(() => ({
      subject: 'Confirmation',
      text: 'Confirmez votre compte',
    })),
  };
  const service = new UserService(prisma as never, mail as never);
  const registration = {
    firstname: 'Ada',
    lastname: 'Lovelace',
    email: 'ada@example.test',
    password: 'test123456',
    confirmationPassword: 'test123456',
    invitationToken: 'a'.repeat(43),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.adminUserInvitation.findFirst.mockResolvedValue({ id: 'inv-1' });
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.test',
      password: 'hash',
    });
    prisma.adminUserInvitation.updateMany.mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma),
    );
    (argon2.hash as jest.Mock).mockResolvedValue('hash');
  });

  it('lie l’invitation au nouveau compte sans activer l’offre payante', async () => {
    await service.create(registration);

    const invitationLookups = prisma.adminUserInvitation.findFirst.mock
      .calls as Array<
      [
        {
          where: { email: string; tokenHash: string; userId: null };
        },
      ]
    >;
    const invitationLookup = invitationLookups[0][0];
    expect(invitationLookup.where.email).toBe('ada@example.test');
    expect(invitationLookup.where.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(invitationLookup.where.userId).toBeNull();
    expect(prisma.userSubscription.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        subscriptionPlan: 'FREE',
        isActive: true,
      },
    });
    const invitationUpdates = prisma.adminUserInvitation.updateMany.mock
      .calls as Array<
      [
        {
          where: { id: string; userId: null };
          data: { userId: string; acceptedAt: Date };
        },
      ]
    >;
    const invitationUpdate = invitationUpdates[0][0];
    expect(invitationUpdate.where).toEqual({ id: 'inv-1', userId: null });
    expect(invitationUpdate.data.userId).toBe('user-1');
    expect(invitationUpdate.data.acceptedAt).toBeInstanceOf(Date);
  });

  it('refuse un jeton qui ne correspond pas à l’adresse invitée', async () => {
    prisma.adminUserInvitation.findFirst.mockResolvedValue(null);

    await expect(service.create(registration)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
