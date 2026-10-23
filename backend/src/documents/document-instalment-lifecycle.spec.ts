import { describe, expect, it, jest } from '@jest/globals';
import { DocumentService } from './document.service';

jest.mock('src/Adapters/PaymentAdapters/payment.service', () => ({
  PaymentService: class {},
}));
jest.mock(
  'src/Adapters/PaymentAdapters/gocardless/gocardless-instalment-retry.service',
  () => ({ GoCardlessInstalmentRetryService: class {} }),
);

describe('DocumentService instalment lifecycle', () => {
  const prisma = {
    invoicePaymentMode: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    invoiceInstalmentPlan: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    invoicePublicAccess: {
      findUnique: jest.fn(),
    },
    document: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const planAccess = { assertFeatureAvailable: jest.fn() };
  const config = { get: jest.fn() };
  const service = new DocumentService(
    prisma as never,
    null as never,
    null as never,
    null as never,
    config as never,
    planAccess as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(prisma),
    );
  });

  it('saves draft payment settings without creating instalments', async () => {
    await service['syncInvoiceInstalmentPlan'](
      prisma as never,
      {
        id: 'invoice-1',
        companyId: 'company-1',
        totalPrice: 120,
        createdAt: new Date('2026-10-23'),
      },
      { numberOfInstalments: 2, firstDueDate: '2026-11-15' },
    );

    expect(prisma.invoicePaymentMode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          paymentMode: 'INSTALMENTS',
          firstDueDate: new Date('2026-11-15T12:00:00.000Z'),
        }),
      }),
    );
    expect(prisma.invoiceInstalmentPlan.create).not.toHaveBeenCalled();
  });

  it('creates the schedule and marks the invoice sent in one transaction', async () => {
    prisma.invoicePaymentMode.findUnique.mockResolvedValue({
      paymentMode: 'INSTALMENTS',
      paymentModeFrequency: 'WEEKLY',
      numberOfInstalments: 2,
      firstDueDate: new Date('2026-11-15'),
    });
    prisma.invoicePublicAccess.findUnique.mockResolvedValue({
      invoicePaymentLink: { providerReference: 'BR-123' },
    });

    await service['markInvoiceAsDelivered']('invoice-1', 120);

    expect(prisma.invoiceInstalmentPlan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        invoiceId: 'invoice-1',
        totalAmountInCents: 12000,
        providerReference: 'BR-123',
        invoicePaymentInstalments: {
          create: [
            expect.objectContaining({ amountInCents: 6000 }),
            expect.objectContaining({ amountInCents: 6000 }),
          ],
        },
      }),
    });
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'invoice-1' },
      data: { invoiceStatus: 'PENDING', sentAt: expect.any(Date) },
    });
  });
});
