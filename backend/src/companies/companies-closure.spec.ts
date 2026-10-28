/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are dynamically typed. */
import { BadRequestException } from '@nestjs/common';
import { CompaniesService } from './companies.service';

describe('CompaniesService — fermeture', () => {
  const prisma = {
    company: {
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new CompaniesService(prisma as never, {} as never);
  beforeEach(() => jest.clearAllMocks());

  it('conserve la date et le motif d’une entreprise déjà fermée', async () => {
    const original = new Date('2026-01-01');
    prisma.company.findUniqueOrThrow.mockResolvedValue({
      closedAt: original,
      closingReason: 'Ancien motif',
    });
    await service.closeCompany(
      prisma as never,
      'c1',
      'Clôture du compte',
      new Date(),
      true,
    );
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: expect.objectContaining({
        status: 'CLOSED',
        closedAt: original,
        closingReason: 'Ancien motif',
        closedByAccountClosureAt: expect.any(Date),
      }),
    });
  });

  it('refuse la réactivation ordinaire après clôture du compte propriétaire', async () => {
    prisma.company.findFirst.mockResolvedValue({
      id: 'c1',
      closedByAccountClosureAt: new Date(),
    });
    await expect(
      service.performOwnedCompanyAction('c1', 'u1', 'reactivate'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.company.update).not.toHaveBeenCalled();
  });

  it('efface closedAt à la réactivation ordinaire', async () => {
    prisma.company.findFirst.mockResolvedValue({
      id: 'c1',
      closedAt: new Date(),
      closedByAccountClosureAt: null,
    });
    await service.performOwnedCompanyAction('c1', 'u1', 'reactivate');
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { status: 'ACTIVE', closedAt: null, closingReason: null },
    });
  });
});
