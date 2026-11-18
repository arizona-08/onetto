import { SuperPdpB2bService } from './superpdp-b2b.service';

describe('SuperPdpB2bService status synchronization', () => {
  afterEach(() => jest.restoreAllMocks());

  it('records the provider HTTP status when invoice events cannot be read', async () => {
    const transmission = {
      id: 'transmission-1', providerInvoiceId: '2184970',
      status: 'DELIVERED', providerStatus: 'fr:202',
    };
    const prisma = {
      document: { findFirst: jest.fn().mockResolvedValue({ id: 'invoice-1' }) },
      electronicInvoiceTransmission: {
        findUnique: jest.fn().mockResolvedValue(transmission),
        update: jest.fn(),
      },
    };
    const oauth = { getAccessToken: jest.fn().mockResolvedValue('access-token') };
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ events: [] }) } as Response)
      .mockResolvedValueOnce({ ok: false, status: 429 } as Response);
    const service = new SuperPdpB2bService(prisma as never, oauth as never, {} as never);

    await expect(service.sync({ companyId: 'company-1', documentId: 'invoice-1', user: { id: 'user-1' } as never }))
      .rejects.toThrow('Le statut de la facture électronique ne peut pas être mis à jour');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const calls = prisma.electronicInvoiceTransmission.update.mock.calls as unknown as Array<[
      { where: { id: string }; data: { lastError: string } },
    ]>;
    const update = calls[0][0];
    expect(update.where.id).toBe('transmission-1');
    expect(update.data.lastError).toBe('Lecture SuperPDP des événements : HTTP 429.');
  });
});
