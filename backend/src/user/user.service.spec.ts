jest.mock('argon2', () => ({
  __esModule: true,
  default: { verify: jest.fn(), hash: jest.fn() },
}));

import argon2 from 'argon2';
import { BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';

describe('UserService', () => {
  const prisma = {
    user: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  };
  const service = new UserService(prisma as never);

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
});
