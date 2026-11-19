import { SuperPdpB2bService } from './superpdp-b2b.service';

describe('SuperPdpB2bService invoice format', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    {
      setting: 'FACTUR_X',
      previousFormat: null,
      expectedFormat: 'factur-x',
      expectedContentType: 'application/pdf',
      expectedBody: '%PDF-invoice',
      validationCount: 1,
    },
    {
      setting: 'UBL',
      previousFormat: null,
      expectedFormat: 'ubl-peppol',
      expectedContentType: 'application/xml',
      expectedBody: '<Invoice/>',
      validationCount: 2,
    },
    {
      setting: 'FACTUR_X',
      previousFormat: 'ubl-peppol',
      expectedFormat: 'ubl-peppol',
      expectedContentType: 'application/xml',
      expectedBody: '<Invoice/>',
      validationCount: 2,
    },
  ])(
    'sends $expectedFormat for setting $setting and previous format $previousFormat',
    async ({
      setting,
      previousFormat,
      expectedFormat,
      expectedContentType,
      expectedBody,
      validationCount,
    }) => {
      const document = {
        id: 'invoice-1',
        companyId: 'company-1',
        documentNumber: 'FACT-1',
        sentAt: new Date('2026-11-19'),
        clientType: 'BUSINESS',
        clientElectronicAddress: '315143296_81589',
        clientElectronicAddressScheme: '0225',
        company: { b2bInvoiceFormat: setting },
      };
      const previous = previousFormat
        ? {
            id: 'transmission-1',
            providerInvoiceId: null,
            status: 'FAILED',
            submittedFormat: previousFormat,
          }
        : null;
      const prisma = {
        document: { findFirst: jest.fn().mockResolvedValue(document) },
        electronicInvoiceTransmission: {
          findUnique: jest.fn().mockResolvedValue(previous),
          create: jest.fn().mockResolvedValue({ id: 'transmission-1' }),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      const facturX = {
        archive: jest.fn().mockResolvedValue(Buffer.from('%PDF-invoice')),
        regenerateForFailedB2BTransmission: jest
          .fn()
          .mockResolvedValue(Buffer.from('%PDF-invoice')),
        generatePeppolUbl: jest
          .fn()
          .mockResolvedValue(Buffer.from('<Invoice/>')),
      };
      const oauth = { getAccessToken: jest.fn().mockResolvedValue('token') };
      const service = new SuperPdpB2bService(
        prisma as never,
        oauth as never,
        facturX as never,
      );
      jest.spyOn(service, 'sync').mockResolvedValue({} as never);
      jest
        .spyOn(service, 'reportContractStagePayment')
        .mockResolvedValue(undefined);
      const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((url) =>
        Promise.resolve(
          (url instanceof URL
            ? url.href
            : typeof url === 'string'
              ? url
              : url.url
          ).includes('validation_reports')
            ? ({
                ok: true,
                json: () => Promise.resolve({ data: [{ is_valid: true }] }),
              } as Response)
            : ({
                ok: true,
                json: () => Promise.resolve({ id: 123 }),
              } as Response),
        ),
      );

      await service.send({
        companyId: 'company-1',
        documentId: 'invoice-1',
        user: { id: 'user-1' } as never,
      });

      const validationCalls = fetchMock.mock.calls.filter(([url]) =>
        (url instanceof URL
          ? url.href
          : typeof url === 'string'
            ? url
            : url.url
        ).includes('validation_reports'),
      );
      expect(validationCalls).toHaveLength(validationCount);
      const submission = fetchMock.mock.calls.find(([url]) =>
        (url instanceof URL
          ? url.href
          : typeof url === 'string'
            ? url
            : url.url
        ).includes('/v1.beta/invoices?'),
      );
      expect(submission).toBeDefined();
      const options = submission?.[1] as RequestInit;
      expect((options.headers as Record<string, string>)['Content-Type']).toBe(
        expectedContentType,
      );
      expect(Buffer.from(options.body as Uint8Array).toString()).toBe(
        expectedBody,
      );
      const updates = prisma.electronicInvoiceTransmission.update.mock
        .calls as unknown as Array<
        [
          {
            where: { id: string };
            data: {
              status: string;
              submittedFormat: string;
              providerInvoiceId?: string;
            };
          },
        ]
      >;
      expect(
        updates.some(
          ([{ where, data }]) =>
            where.id === 'transmission-1' &&
            data.status === 'SUBMITTING' &&
            data.submittedFormat === expectedFormat,
        ),
      ).toBe(true);
      expect(
        updates.some(
          ([{ where, data }]) =>
            where.id === 'transmission-1' &&
            data.status === 'SUBMITTED' &&
            data.submittedFormat === expectedFormat &&
            data.providerInvoiceId === '123',
        ),
      ).toBe(true);
      expect(facturX.generatePeppolUbl).toHaveBeenCalledTimes(
        expectedFormat === 'ubl-peppol' ? 1 : 0,
      );
    },
  );
});
