import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlanAccessService } from './plan-access.service';

describe('PlanAccessService', () => {
  const prisma = {
    user: { findUniqueOrThrow: jest.fn() },
    company: { count: jest.fn(), findUniqueOrThrow: jest.fn() },
  };
  const service = new PlanAccessService(prisma as never);

  beforeEach(() => jest.resetAllMocks());

  it.each([
    ['FREE', 'FREE', 1],
    ['STARTER_MONTHLY', 'STARTER', 1],
    ['PRO_YEARLY', 'PRO', 3],
  ])('normalise %s en %s', (stripePlan, expectedPlan, maxCompanies) => {
    const access = service.getAccess(stripePlan as never);
    expect(access.currentPlan).toBe(expectedPlan);
    expect(access.maxOwnedCompanies).toBe(maxCompanies);
  });

  it('refuse une deuxième entreprise pour FREE et STARTER', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      accountType: 'BUSINESS_OWNER',
      subscription: { subscriptionPlan: 'FREE', isActive: true },
    });
    prisma.company.count.mockResolvedValue(1);

    await expect(
      service.assertCanCreateCompany('owner-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('autorise trois entreprises pour PRO puis refuse la quatrième', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      accountType: 'BUSINESS_OWNER',
      subscription: { subscriptionPlan: 'PRO_MONTHLY', isActive: true },
    });
    prisma.company.count.mockResolvedValueOnce(2).mockResolvedValueOnce(3);

    await expect(
      service.assertCanCreateCompany('owner-1'),
    ).resolves.toMatchObject({
      currentPlan: 'PRO',
    });
    await expect(
      service.assertCanCreateCompany('owner-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('résout les droits depuis le propriétaire de la société', async () => {
    prisma.company.findUniqueOrThrow.mockResolvedValue({
      owner: {
        subscription: { subscriptionPlan: 'PRO_MONTHLY', isActive: true },
      },
    });

    await expect(
      service.assertFeatureAvailable('company-1', 'instalments'),
    ).resolves.toMatchObject({ currentPlan: 'PRO' });
  });

  it('refuse la négociation et les échéances pour FREE', async () => {
    prisma.company.findUniqueOrThrow.mockResolvedValue({
      owner: { subscription: { subscriptionPlan: 'FREE', isActive: true } },
    });

    await expect(
      service.assertFeatureAvailable('company-1', 'negotiation'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.assertFeatureAvailable('company-1', 'instalments'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
