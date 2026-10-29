import { ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  function context(appUserRole: 'USER' | 'ADMIN' | 'SUPERADMIN') {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'admin-1', appUserRole } }),
      }),
    } as never;
  }

  it('refuse un utilisateur non administrateur', () => {
    expect(() => guard.canActivate(context('USER'))).toThrow(
      ForbiddenException,
    );
  });

  it('autorise un administrateur global', () => {
    expect(guard.canActivate(context('ADMIN'))).toBe(true);
  });

  it('autorise un super administrateur', () => {
    expect(guard.canActivate(context('SUPERADMIN'))).toBe(true);
  });
});
