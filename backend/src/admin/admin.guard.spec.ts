import { ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  function context(isAdmin: boolean) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'admin-1', isAdmin } }),
      }),
    } as never;
  }

  it('refuse un utilisateur non administrateur', () => {
    expect(() => guard.canActivate(context(false))).toThrow(ForbiddenException);
  });

  it('autorise un administrateur global', () => {
    expect(guard.canActivate(context(true))).toBe(true);
  });
});
