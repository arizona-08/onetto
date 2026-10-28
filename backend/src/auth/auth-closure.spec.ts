/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are dynamically typed. */
jest.mock('argon2', () => ({
  __esModule: true,
  default: { verify: jest.fn().mockResolvedValue(true) },
}));

import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService — compte clôturé', () => {
  const prisma = {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  };
  const jwt = { verifyAsync: jest.fn(), signAsync: jest.fn() };
  const service = new AuthService(
    prisma as never,
    jwt as never,
    {} as never,
    {} as never,
  );
  const response = { cookie: jest.fn(), clearCookie: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('refuse une nouvelle connexion', async () => {
    prisma.user.findUnique.mockResolvedValue({
      password: 'hash',
      closedAt: new Date(),
      emailVerifiedAt: new Date(),
    });
    await expect(
      service.login(
        { email: 'a@test.fr', password: 'password' },
        response as never,
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('refuse un refresh token émis avant la clôture', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', iat: 1 });
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      closedAt: new Date(),
      bannedAt: null,
      passwordChangedAt: null,
    });
    await expect(
      service.refreshToken(
        { cookies: { refresh_token: 'token' } } as never,
        response as never,
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('n’envoie pas de réinitialisation au compte clôturé', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@test.fr',
      closedAt: new Date(),
    });
    await service.requestPasswordReset('a@test.fr');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuse un ancien lien de réinitialisation', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.resetPassword('token', 'password123', 'password123'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ closedAt: null }),
      }),
    );
  });
});
