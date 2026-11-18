import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { DocumentService } from './document.service';
import type { CreateDocumentDto } from './dtos/create-document.dto';

jest.mock('src/Adapters/PaymentAdapters/payment.service', () => ({
  PaymentService: class {},
}));
jest.mock(
  'src/Adapters/PaymentAdapters/gocardless/gocardless-provider.service',
  () => ({
    GoCardlessProviderService: class {},
  }),
);
jest.mock(
  'src/Adapters/PaymentAdapters/gocardless/gocardless-instalment-retry.service',
  () => ({ GoCardlessInstalmentRetryService: class {} }),
);

const created = {
  id: 'document-1',
  companyId: 'company-1',
  totalPrice: 120,
  createdAt: new Date('2026-11-17'),
};

function setup() {
  const prisma = {
    document: {
      create: jest.fn(() => Promise.resolve(created)),
      findFirst: jest.fn((): Promise<unknown> => Promise.resolve(null)),
      update: jest.fn(() => Promise.resolve({ ...created, type: 'ESTIMATE' })),
    },
    documentService: { create: jest.fn(() => Promise.resolve(null)) },
    invoicePaymentMode: { upsert: jest.fn(() => Promise.resolve(null)) },
    invoiceInstalmentPlan: { deleteMany: jest.fn(() => Promise.resolve(null)) },
    contractPaymentPlan: { findUnique: jest.fn(() => Promise.resolve(null)) },
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(prisma),
    ),
  };
  const planAccess = {
    assertFeatureAvailable: jest.fn(() => Promise.resolve()),
  };
  const service = new DocumentService(
    prisma as never,
    null as never,
    null as never,
    null as never,
    { get: () => '' } as never,
    planAccess as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
  );
  Object.defineProperty(service, 'getActiveCompanyId', {
    value: () => Promise.resolve('company-1'),
  });
  service.createDocumentNumber = () => Promise.resolve('#DEV-2026-0001');
  return { prisma, planAccess, service };
}

const quote: CreateDocumentDto = {
  type: 'ESTIMATE',
  client: {
    name: 'Client',
    email: 'client@example.com',
    address: '1 rue du Test',
    city: 'Paris',
    postalCode: '75001',
    country: 'France',
  },
  lineItems: [
    {
      description: 'Prestation',
      quantity: 1,
      unitPrice: 100,
      taxRate: 20,
      unit: 'forfait',
    },
  ],
  documentDates: { dueDate: '2027-01-30' },
  instalmentsDetails: { numberOfInstalments: 2, firstDueDate: '2027-01-15' },
};

describe('Devis à paiement en plusieurs fois', () => {
  it('enregistre le choix sur le devis sans créer d’échéancier opérationnel', async () => {
    const { prisma, planAccess, service } = setup();

    await service.createDocument(quote, {} as never);

    expect(planAccess.assertFeatureAvailable).toHaveBeenCalledWith(
      'company-1',
      'instalments',
    );
    expect(prisma.invoicePaymentMode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { invoiceId: 'document-1' },
        create: expect.objectContaining({
          paymentMode: 'INSTALMENTS',
          numberOfInstalments: 2,
        }),
      }),
    );
    expect(prisma.invoiceInstalmentPlan.deleteMany).toHaveBeenCalled();
  });

  it('refuse de cumuler acomptes et plusieurs fois', async () => {
    const { prisma, service } = setup();

    await expect(
      service.createDocument(
        {
          ...quote,
          depositPlan: {
            deposits: [{ percentage: 30, triggerCondition: 'À la signature' }],
            balanceCondition: 'À la livraison',
          },
        },
        {} as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it('retire le paiement en plusieurs fois quand le brouillon repasse en unique', async () => {
    const { prisma, service } = setup();
    prisma.document.findFirst = jest.fn(() =>
      Promise.resolve({
        ...created,
        type: 'ESTIMATE',
        estimateStatus: 'DRAFT',
        services: [],
      }),
    );

    await service.updateDraftDocument(
      'document-1',
      { ...quote, instalmentsDetails: undefined },
      {} as never,
    );

    expect(prisma.invoicePaymentMode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { invoiceId: 'document-1' },
        update: expect.objectContaining({ paymentMode: 'ONE_TIME' }),
      }),
    );
  });

  it('transfère le plan du devis accepté sur la facture', async () => {
    const { prisma, service } = setup();
    prisma.document.findFirst = jest.fn(() =>
      Promise.resolve({
        ...created,
        type: 'ESTIMATE',
        estimateStatus: 'ACCEPTED',
        clientName: 'Client',
        clientEmail: 'client@example.com',
        clientAddress: '1 rue du Test',
        clientCity: 'Paris',
        clientCountry: 'France',
        clientPostalCode: '75001',
        totalPriceExcludingTax: 100,
        paymentDueAt: new Date('2027-01-30'),
        services: [],
        contractPaymentPlan: null,
        convertedDocuments: [],
        invoicePaymentMode: {
          paymentMode: 'INSTALMENTS',
          numberOfInstalments: 2,
          firstDueDate: new Date('2027-01-15T12:00:00.000Z'),
        },
      }),
    );

    await service.convertEstimateToInvoice('estimate-1', {} as never);

    expect(prisma.invoicePaymentMode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { invoiceId: 'document-1' },
        create: expect.objectContaining({
          paymentMode: 'INSTALMENTS',
          numberOfInstalments: 2,
          firstDueDate: new Date('2027-01-15T12:00:00.000Z'),
        }),
      }),
    );
  });
});
