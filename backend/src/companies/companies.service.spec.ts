import { CompaniesService } from './companies.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('CompaniesService', () => {
  const prisma = {
    company: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  let service: CompaniesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CompaniesService(prisma);
  });

  it('résume les frais mensuels des seules entreprises détenues par l’utilisateur', async () => {
    (prisma.company.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'company-1',
        name: 'Entreprise A',
        invoicePaymentFees: [
          { amountInCents: 100 },
          { amountInCents: 25 },
        ],
      },
      {
        id: 'company-2',
        name: 'Entreprise B',
        invoicePaymentFees: [{ amountInCents: 0 }],
      },
    ]);

    const summary = await service.getCurrentInvoiceFeeSummary('user-1');

    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: 'user-1' },
      }),
    );
    expect(summary.totalAmountInCents).toBe(125);
    expect(summary.companies).toEqual([
      {
        companyId: 'company-1',
        companyName: 'Entreprise A',
        paidInvoicesCount: 2,
        amountInCents: 125,
      },
      {
        companyId: 'company-2',
        companyName: 'Entreprise B',
        paidInvoicesCount: 1,
        amountInCents: 0,
      },
    ]);
  });
});
