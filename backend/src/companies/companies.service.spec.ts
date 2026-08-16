import { CompaniesService } from './companies.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('CompaniesService', () => {
  const prisma = {
    company: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    invoicePaymentFee: {
      aggregate: jest.fn(),
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

  it('retourne le cumul et l’historique des frais d’une entreprise accessible à l’utilisateur', async () => {
    (prisma.company.findFirst as jest.Mock).mockResolvedValue({ id: 'company-1' });
    (prisma.invoicePaymentFee.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amountInCents: 125 },
      _count: { id: 2 },
    });
    (prisma.invoicePaymentFee.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'fee-1',
        amountInCents: 100,
        paymentMethod: 'BANK_TRANSFER',
        createdAt: new Date('2026-08-10'),
        document: {
          id: 'invoice-1',
          documentNumber: '#FACT-2026-0001',
          invoiceStatus: 'PAID_MANUALLY',
        },
      },
    ]);

    const details = await service.getCompanyInvoiceFeeDetails('company-1', 'user-1');

    expect(prisma.company.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'company-1',
        OR: [
          { ownerId: 'user-1' },
          { companyUsers: { some: { userId: 'user-1' } } },
        ],
      },
    });
    expect(details.currentPeriodAmountInCents).toBe(125);
    expect(details.paidInvoicesCount).toBe(2);
    expect(details.history).toEqual([
      expect.objectContaining({
        id: 'fee-1',
        amountInCents: 100,
        paymentMethod: 'BANK_TRANSFER',
        invoice: expect.objectContaining({ documentNumber: '#FACT-2026-0001' }),
      }),
    ]);
  });
});
