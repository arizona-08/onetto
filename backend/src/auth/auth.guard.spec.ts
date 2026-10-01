import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

describe('AuthGuard — comptes bannis', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const userService = {
    findBy: jest.fn(),
  };
  const guard = new AuthGuard(jwtService as never, userService as never);
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({
        cookies: { access_token: 'token' },
        headers: {},
      }),
    }),
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService.verifyAsync.mockResolvedValue({
      email: 'user@test.com',
      iat: 1,
    });
  });

  it('refuse une requête avec un jeton valide si le compte est banni', async () => {
    userService.findBy.mockResolvedValue({ bannedAt: new Date() });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('autorise un compte actif', async () => {
    userService.findBy.mockResolvedValue({ bannedAt: null });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
