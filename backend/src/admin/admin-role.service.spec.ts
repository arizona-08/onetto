import { ForbiddenException } from '@nestjs/common';
import { AppUserRole } from '@prisma/client';
import { AdminService } from './admin.service';

describe('AdminService — hiérarchie des rôles', () => {
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    adminAuditLog: { create: jest.fn() },
  };
  const service = new AdminService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.user.update.mockResolvedValue({ id: 'target-1' });
  });

  it('empêche un admin de modifier un autre admin', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        appUserRole: AppUserRole.ADMIN,
        _count: { ownedCompanies: 0, companies: 0 },
      })
      .mockResolvedValueOnce({ appUserRole: AppUserRole.ADMIN });

    await expect(
      service.updateUser('admin-1', 'admin-2', { firstname: 'Autre' }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('autorise un super admin à modifier un admin', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        appUserRole: AppUserRole.ADMIN,
        _count: { ownedCompanies: 0, companies: 0 },
      })
      .mockResolvedValueOnce({ appUserRole: AppUserRole.SUPERADMIN });

    await service.updateUser('super-1', 'admin-2', { firstname: 'Modifié' });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'admin-2' },
        data: { firstname: 'Modifié' },
      }),
    );
  });

  it('laisse un admin modifier ses propres informations', async () => {
    prisma.user.findUnique.mockResolvedValue({
      appUserRole: AppUserRole.ADMIN,
      _count: { ownedCompanies: 0, companies: 0 },
    });

    await service.updateUser('admin-1', 'admin-1', { lastname: 'Modifié' });

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('empêche un admin de modifier l’abonnement d’un autre admin', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ appUserRole: AppUserRole.ADMIN })
      .mockResolvedValueOnce({ appUserRole: AppUserRole.ADMIN });

    await expect(
      service.changeUserSubscription('admin-1', 'admin-2', 'FREE'),
    ).rejects.toThrow(ForbiddenException);
  });
});
