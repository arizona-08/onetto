/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest matchers are dynamically typed. */
import { AdminService } from './admin.service';
import { Prisma } from '@prisma/client';

describe('AdminService — listes', () => {
  const prisma = {
    user: { count: jest.fn(), findMany: jest.fn() },
    userSubscription: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    company: { count: jest.fn(), findUnique: jest.fn() },
    companyUser: { count: jest.fn() },
    document: { count: jest.fn() },
    payByBankPayment: { count: jest.fn(), findMany: jest.fn() },
    adminAuditLog: { count: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn(),
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
    prisma.user.count.mockResolvedValue(0);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.userSubscription.count.mockResolvedValue(0);
    prisma.userSubscription.findMany.mockResolvedValue([]);
    prisma.userSubscription.groupBy.mockResolvedValue([]);
    prisma.company.count.mockResolvedValue(0);
    prisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      companyUsers: [],
      documents: [],
    });
    prisma.companyUser.count.mockResolvedValue(0);
    prisma.document.count.mockResolvedValue(0);
    prisma.payByBankPayment.count.mockResolvedValue(0);
    prisma.payByBankPayment.findMany.mockResolvedValue([]);
    prisma.adminAuditLog.count.mockResolvedValue(0);
    prisma.adminAuditLog.findMany.mockResolvedValue([]);
  });

  it('filtre les utilisateurs avant de charger la deuxième page de dix', async () => {
    prisma.user.count.mockResolvedValue(23);
    const result = await service.users({ page: 2, query: 'ada' });

    expect(prisma.user.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ OR: expect.any(Array) }),
    });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 23,
      totalPages: 3,
    });
  });

  it('retrouve un utilisateur par prénom et nom saisis ensemble', async () => {
    await service.users({ query: 'Ada Lovelace' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              AND: [
                { firstname: { contains: 'Ada', mode: 'insensitive' } },
                { lastname: { contains: 'Lovelace', mode: 'insensitive' } },
              ],
            },
          ]),
        }),
      }),
    );
  });

  it('cherche les abonnements dans les données utilisateur et Stripe', async () => {
    await service.subscriptions({ page: 3, query: 'cus_123' });

    expect(prisma.userSubscription.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          { customerId: { contains: 'cus_123', mode: 'insensitive' } },
        ]),
      }),
    });
    expect(prisma.userSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it('cherche les paiements par référence, facture et entreprise', async () => {
    await service.payments({ query: 'Atelier' });

    expect(prisma.payByBankPayment.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ OR: expect.any(Array) }),
    });
    expect(prisma.payByBankPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 }),
    );
  });

  it('ne charge pas une liste d’utilisateurs pour les indicateurs du tableau de bord', async () => {
    await service.dashboard();

    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('filtre et pagine séparément les collaborateurs et documents d’une entreprise', async () => {
    prisma.companyUser.count.mockResolvedValue(22);
    prisma.document.count.mockResolvedValue(13);
    const result = await service.company('company-1', {
      collaboratorsPage: 2,
      collaboratorsQuery: 'Ada',
      documentsPage: 1,
      documentsQuery: 'FAC-2026',
    });

    expect(prisma.company.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          companyUsers: expect.objectContaining({ skip: 10, take: 10 }),
          documents: expect.objectContaining({ skip: 0, take: 10 }),
        }),
      }),
    );
    expect(result.companyUsers.pagination.totalPages).toBe(3);
    expect(result.documents.pagination.totalPages).toBe(2);
  });

  it('pagine indépendamment les webhooks et les audits', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ total: 27n }])
      .mockResolvedValueOnce([]);
    prisma.adminAuditLog.count.mockResolvedValue(12);

    const result = await service.system({
      webhooksPage: 2,
      webhooksQuery: 'stripe',
      auditsPage: 1,
      auditsQuery: 'ADMIN_UPDATED_USER',
    });

    expect(result.webhooks.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 27,
      totalPages: 3,
    });
    expect(result.audits.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 12,
      totalPages: 2,
    });
    expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 }),
    );
    const rawQueries = prisma.$queryRaw.mock.calls as Array<[Prisma.Sql]>;
    expect(rawQueries[0][0].values).toContain('%stripe%');
    expect(rawQueries[1][0].values).toEqual(expect.arrayContaining([10, 10]));
  });
});
