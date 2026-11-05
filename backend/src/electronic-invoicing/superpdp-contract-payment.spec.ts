import { SuperPdpB2bService } from './superpdp-b2b.service';

describe('SuperPDP contract payment declaration', () => {
  const document = {
    id: 'invoice-1', companyId: 'company-1', clientType: 'BUSINESS',
    clientCountry: 'France', invoiceStatus: 'PAID', totalPrice: 30,
    currencyCode: 'EUR', company: { vatExigibility: 'ON_COLLECTION' },
    contractStageInvoice: {
      payment: { id: 'payment-1', status: 'SUCCESS', manualSettlementAt: null, updatedAt: new Date('2026-11-05') },
    },
    electronicInvoiceTransmissions: [{ id: 'transmission-1', providerInvoiceId: '123', status: 'ACCEPTED' }],
  };
  const prisma = {
    document: { findUnique: jest.fn() },
    electronicInvoiceEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const oauth = { getAccessToken: jest.fn() };
  const service = new SuperPdpB2bService(prisma as never, oauth as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.document.findUnique.mockResolvedValue(document);
    prisma.electronicInvoiceEvent.findUnique.mockResolvedValue(null);
    prisma.electronicInvoiceEvent.create.mockResolvedValue({ id: 'reservation-1' });
    oauth.getAccessToken.mockResolvedValue('sandbox-token');
  });

  afterEach(() => jest.restoreAllMocks());

  it('reports the amount received once, with a persisted reservation', async () => {
    const request = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => ({ id: 456, status_code: 'fr:212' }),
    } as never);
    await service.reportContractStagePayment('invoice-1');
    expect(prisma.electronicInvoiceEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sourceReference: 'contract:payment-1', providerStatus: 'PENDING' }),
    });
    const body = JSON.parse((request.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({ invoice_id: 123, status_code: 'fr:212' });
    expect(body.details[0].reported_data[0].amount).toBe('30.00');
    expect(prisma.electronicInvoiceEvent.update).toHaveBeenCalledWith({
      where: { id: 'reservation-1' },
      data: expect.objectContaining({ providerEventId: '456', providerStatus: 'fr:212' }),
    });
  });

  it('does not send a second event for the same payment', async () => {
    const request = jest.spyOn(global, 'fetch');
    prisma.electronicInvoiceEvent.findUnique.mockResolvedValue({ id: 'existing' });
    await service.reportContractStagePayment('invoice-1');
    expect(request).not.toHaveBeenCalled();
  });
});
