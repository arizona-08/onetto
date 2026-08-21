import { InvoicePaymentFeeService } from './invoice-payment-fee.service';

describe('InvoicePaymentFeeService', () => {
  const prisma = {
    invoicePaymentFee: {
      findUnique: jest.fn(),
      aggregate: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
  } as never;

  let service: InvoicePaymentFeeService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new InvoicePaymentFeeService();
  });

  it('crée des frais de 100 centimes tant que le plafond mensuel le permet', async () => {
    prisma.invoicePaymentFee.findUnique.mockResolvedValue(null);
    prisma.invoicePaymentFee.aggregate.mockResolvedValue({
      _sum: { amountInCents: 4700 },
    });

    await service.createForPaidInvoice('invoice-1', 'company-1', prisma);

    expect(prisma.invoicePaymentFee.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ amountInCents: 100 }),
      }),
    );
  });

  it('limite les frais au solde restant du plafond mensuel', async () => {
    prisma.invoicePaymentFee.findUnique.mockResolvedValue(null);
    prisma.invoicePaymentFee.aggregate.mockResolvedValue({
      _sum: { amountInCents: 4975 },
    });

    await service.createForPaidInvoice('invoice-1', 'company-1', prisma);

    expect(prisma.invoicePaymentFee.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ amountInCents: 25 }),
        update: { amountInCents: 25 },
      }),
    );
  });

  it('enregistre le moyen de paiement d’une facture réglée manuellement', async () => {
    prisma.invoicePaymentFee.findUnique.mockResolvedValue(null);
    prisma.invoicePaymentFee.aggregate.mockResolvedValue({
      _sum: { amountInCents: 0 },
    });

    await service.createForPaidInvoice(
      'invoice-1',
      'company-1',
      prisma,
      'CHECK',
    );

    expect(prisma.invoicePaymentFee.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ paymentMethod: 'CHECK' }),
        update: expect.objectContaining({ paymentMethod: 'CHECK' }),
      }),
    );
  });

  it('remet les frais à zéro quand la facture repasse en attente', async () => {
    await service.resetForPendingInvoice('invoice-1', prisma);

    expect(prisma.invoicePaymentFee.updateMany).toHaveBeenCalledWith({
      where: { documentId: 'invoice-1' },
      data: { amountInCents: 0 },
    });
  });
});
