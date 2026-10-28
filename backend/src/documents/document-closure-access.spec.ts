/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are dynamically typed. */
jest.mock('gocardless-nodejs', () => ({
  Environments: {},
  GoCardlessClient: jest.fn(),
}));

import { BadRequestException } from '@nestjs/common';
import { DocumentService } from './document.service';

describe('DocumentService — entreprise fermée', () => {
  const prisma = {
    invoicePublicAccess: { findUnique: jest.fn() },
    companyUser: { findFirst: jest.fn() },
  };
  const service = Object.create(DocumentService.prototype) as DocumentService;
  Reflect.set(service, 'prismaService', prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.invoicePublicAccess.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 86_400_000),
      invoice: {
        id: 'invoice-1',
        type: 'INVOICE',
        sentAt: new Date(),
        company: { status: 'CLOSED' },
      },
      invoicePaymentLink: {
        url: 'https://provider.example/pay',
        linkStatus: 'VALID',
      },
    });
  });

  it('laisse consulter une facture déjà émise sans proposer de nouveau paiement', async () => {
    await expect(service.getPublicPaymentByToken('token')).resolves.toEqual(
      expect.objectContaining({
        paymentLink: null,
        document: expect.objectContaining({ id: 'invoice-1' }),
      }),
    );
  });

  it('ne publie pas un brouillon par un lien public', async () => {
    prisma.invoicePublicAccess.findUnique.mockResolvedValueOnce({
      expiresAt: new Date(Date.now() + 86_400_000),
      invoice: { type: 'INVOICE', sentAt: null, company: { status: 'CLOSED' } },
      invoicePaymentLink: {
        url: 'https://provider.example/pay',
        linkStatus: 'VALID',
      },
    });
    await expect(service.getPublicPaymentByToken('token')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('refuse les droits opérationnels même si CompanyUser est encore présent', async () => {
    prisma.companyUser.findFirst.mockResolvedValue(null);
    await expect(service.isCompanyUser('u1', 'c1')).resolves.toBe(false);
    expect(prisma.companyUser.findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1', companyId: 'c1', company: { status: 'ACTIVE' } },
    });
  });
});
