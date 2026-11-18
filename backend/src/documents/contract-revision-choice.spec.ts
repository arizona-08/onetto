import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { DocumentService } from './document.service';
import { buildContractStages } from './contract-payment-plan';

jest.mock('src/Adapters/PaymentAdapters/payment.service', () => ({
  PaymentService: class {},
}));
jest.mock(
  'src/Adapters/PaymentAdapters/gocardless/gocardless-provider.service',
  () => ({ GoCardlessProviderService: class {} }),
);
jest.mock(
  'src/Adapters/PaymentAdapters/gocardless/gocardless-instalment-retry.service',
  () => ({ GoCardlessInstalmentRetryService: class {} }),
);

const originalStages = buildContractStages(
  39000,
  [{ percentage: 30, triggerCondition: 'À la commande' }],
  'À la livraison',
);
const proposedStages = buildContractStages(
  39000,
  [
    { percentage: 30, triggerCondition: 'À la commande' },
    { percentage: 60, triggerCondition: 'Après la première phase' },
  ],
  'À la livraison',
);

function setup(proposal: typeof proposedStages | null = proposedStages) {
  const source = {
    id: 'original-estimate',
    companyId: 'company-1',
    documentNumber: '#DEV-2026-0001',
    versionNumber: 1,
    services: [],
    invoicePaymentMode: null,
    contractPaymentPlan: {
      totalAmountInCents: 39000,
      stages: originalStages,
    },
  };
  const tx = {
    document: {
      findFirst: jest.fn(() => Promise.resolve(source)),
      create: jest.fn(() => Promise.resolve({ id: 'revised-estimate' })),
      update: jest.fn(() => Promise.resolve(source)),
    },
    documentService: { createMany: jest.fn(() => Promise.resolve({})) },
    estimateNegociation: {
      findFirst: jest.fn(() =>
        Promise.resolve(proposal ? { proposedPaymentStages: proposal } : null),
      ),
    },
    contractPaymentPlan: { create: jest.fn(() => Promise.resolve({})) },
  };
  const prisma = {
    document: tx.document,
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  const service = new DocumentService(
    prisma as never,
    null as never,
    null as never,
    null as never,
    { get: () => '' } as never,
    null as never,
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
  return { service, tx };
}

describe('Choix des acomptes pour un devis révisé', () => {
  it('ne crée pas de brouillon tant que le plan proposé par le client n’est pas choisi ou écarté', async () => {
    const { service, tx } = setup();

    await expect(
      service.createNewDocumentVersion('original-estimate', {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.document.create).not.toHaveBeenCalled();
  });

  it('copie le plan initial lorsque l’entrepreneur le choisit', async () => {
    const { service, tx } = setup();

    await service.createNewDocumentVersion(
      'original-estimate',
      {} as never,
      'ORIGINAL',
    );

    expect(tx.contractPaymentPlan.create).toHaveBeenCalledWith({
      data: {
        estimateId: 'revised-estimate',
        totalAmountInCents: 39000,
        stages: { create: originalStages },
      },
    });
  });

  it('copie le plan révisé lorsque l’entrepreneur le choisit', async () => {
    const { service, tx } = setup();

    await service.createNewDocumentVersion(
      'original-estimate',
      {} as never,
      'CLIENT',
    );

    expect(tx.contractPaymentPlan.create).toHaveBeenCalledWith({
      data: {
        estimateId: 'revised-estimate',
        totalAmountInCents: 39000,
        stages: { create: proposedStages },
      },
    });
    expect(tx.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ estimateStatus: 'DRAFT' }),
    });
  });

  it('conserve le plan initial sans choix si le client n’a pas proposé de révision des acomptes', async () => {
    const { service, tx } = setup(null);

    await service.createNewDocumentVersion('original-estimate', {} as never);

    expect(tx.contractPaymentPlan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ stages: { create: originalStages } }),
    });
  });

  it('ne demande aucun choix si le client a renvoyé un plan identique', async () => {
    const { service, tx } = setup(originalStages);

    await service.createNewDocumentVersion('original-estimate', {} as never);

    expect(tx.contractPaymentPlan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ stages: { create: originalStages } }),
    });
  });
});
