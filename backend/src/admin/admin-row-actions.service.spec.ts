/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest matchers are dynamically typed. */
import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService — actions depuis les listes', () => {
  const prisma = {
    companyService: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    companyUser: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
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
  });

  it('recalcule le montant TTC après modification d’une prestation active', async () => {
    prisma.companyService.findUnique.mockResolvedValue({
      unitPrice: 100,
      taxRate: 20,
      company: { status: 'ACTIVE' },
    });
    prisma.companyService.update.mockResolvedValue({ id: 'service-1' });

    await service.updateService('admin-1', 'service-1', { unitPrice: 150 });

    expect(prisma.companyService.update).toHaveBeenCalledWith({
      where: { id: 'service-1' },
      data: { unitPrice: 150, wtPrice: 150, totalPrice: 180 },
    });
    expect(prisma.adminAuditLog.create).toHaveBeenCalled();
  });

  it('refuse la suppression d’une prestation d’entreprise fermée', async () => {
    prisma.companyService.findUnique.mockResolvedValue({
      company: { status: 'CLOSED' },
    });

    await expect(service.deleteService('admin-1', 'service-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.companyService.delete).not.toHaveBeenCalled();
  });

  it('supprime une prestation active et journalise l’action', async () => {
    prisma.companyService.findUnique.mockResolvedValue({
      company: { status: 'ACTIVE' },
    });

    await service.deleteService('admin-1', 'service-1');

    expect(prisma.companyService.delete).toHaveBeenCalledWith({
      where: { id: 'service-1' },
    });
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'ADMIN_DELETED_SERVICE',
        targetId: 'service-1',
      }),
    });
  });

  it('préserve les collaborateurs d’une entreprise fermée', async () => {
    prisma.companyUser.findUnique.mockResolvedValue({
      company: { status: 'CLOSED' },
    });

    await expect(
      service.removeCompanyUser('admin-1', 'member-1'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.companyUser.delete).not.toHaveBeenCalled();
  });

  it('refuse de relancer l’abonnement d’un compte clôturé', async () => {
    prisma.user.findUnique.mockResolvedValue({
      closedAt: new Date(),
      accountType: 'BUSINESS_OWNER',
      appUserRole: 'USER',
    });

    await expect(
      service.changeUserSubscription('admin-1', 'user-1', 'PRO_MONTHLY'),
    ).rejects.toThrow(BadRequestException);
  });
});
