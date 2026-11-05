import { SuperPdpEreportingService } from './superpdp-ereporting.service';

describe('SuperPDP B2C VAT preparation', () => {
  const submission = {
    id: 'submission-1',
    documentId: 'invoice-1',
    status: 'FAILED',
    lastError:
      'SuperPDP (400) : The VAT regime needs to be setup at the company level.',
  };
  const prisma = {
    document: { findFirst: jest.fn() },
    electronicReportingSubmission: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };
  const oauth = {
    getAccessToken: jest.fn(),
    ensureCompanyVatRegime: jest.fn(),
  };
  const service = new SuperPdpEreportingService(
    prisma as never,
    { get: jest.fn(() => 'true') } as never,
    oauth as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.document.findFirst.mockResolvedValue({
      id: 'invoice-1',
      companyId: 'company-1',
      type: 'INVOICE',
      sentAt: new Date('2026-11-05'),
      clientType: 'INDIVIDUAL',
      clientCountry: 'FR',
      currencyCode: 'EUR',
      isVatExempt: false,
      company: { isVatExempt: false },
      services: [
        { itemType: 'SERVICES', unitPrice: 100, quantity: 1, taxRate: 20 },
      ],
    });
    prisma.electronicReportingSubmission.findFirst.mockResolvedValue(
      submission,
    );
    prisma.electronicReportingSubmission.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.electronicReportingSubmission.update.mockResolvedValue({
      status: 'SUBMITTED',
    });
    oauth.getAccessToken.mockResolvedValue('sandbox-token');
    oauth.ensureCompanyVatRegime.mockResolvedValue({ vat_regime: 'monthly' });
  });

  afterEach(() => jest.restoreAllMocks());

  it('repairs VAT settings before retrying a definitively rejected report', async () => {
    const request = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: [{ id: 123 }] })),
    } as never);
    await service.retryRejectedB2CTransaction({
      companyId: 'company-1',
      submissionId: 'submission-1',
      userId: 'user-1',
    });
    expect(oauth.ensureCompanyVatRegime).toHaveBeenCalledWith(
      'company-1',
      'sandbox-token',
    );
    expect(request).toHaveBeenCalledWith(
      'https://api.superpdp.tech/v1.beta/b2c_transactions',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(
      prisma.electronicReportingSubmission.updateMany,
    ).toHaveBeenCalledWith({
      where: { id: 'submission-1', status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'SUBMITTING', lastError: null },
    });
  });

  it('does not resend a report whose previous response was uncertain', async () => {
    prisma.electronicReportingSubmission.findFirst.mockResolvedValue({
      ...submission,
      lastError: 'network timeout',
    });
    const request = jest.spyOn(global, 'fetch');
    await expect(
      service.retryRejectedB2CTransaction({
        companyId: 'company-1',
        submissionId: 'submission-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('vérifiée');
    expect(request).not.toHaveBeenCalled();
  });

  it('records a VAT setup failure before any transaction is sent', async () => {
    oauth.ensureCompanyVatRegime.mockRejectedValue(
      new Error('Régime de TVA manquant.'),
    );
    const request = jest.spyOn(global, 'fetch');
    await expect(
      service.submitB2CTransaction({
        companyId: 'company-1',
        documentId: 'invoice-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Préparation TVA');
    expect(request).not.toHaveBeenCalled();
    expect(prisma.electronicReportingSubmission.update).toHaveBeenCalledWith({
      where: { id: 'submission-1' },
      data: {
        status: 'FAILED',
        lastError: 'Préparation TVA : Régime de TVA manquant.',
      },
    });
  });

  it('blocks a second sender when the report is already reserved', async () => {
    prisma.electronicReportingSubmission.updateMany.mockResolvedValue({
      count: 0,
    });
    const request = jest.spyOn(global, 'fetch');
    await expect(
      service.submitB2CTransaction({
        companyId: 'company-1',
        documentId: 'invoice-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('déjà en cours');
    expect(request).not.toHaveBeenCalled();
  });
});
