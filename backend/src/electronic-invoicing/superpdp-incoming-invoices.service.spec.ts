import { SuperPdpIncomingInvoicesService } from './superpdp-incoming-invoices.service';

describe('SuperPdpIncomingInvoicesService downloadInvoice', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    {
      content: '%PDF-1.7\ninvoice',
      contentType: 'application/pdf',
      extension: 'pdf',
    },
    {
      content: '<?xml version="1.0"?><Invoice/>',
      contentType: 'application/xml',
      extension: 'xml',
    },
  ])(
    'downloads the archived $extension original without requesting a conversion',
    async ({ content, contentType, extension }) => {
      const original = Buffer.from(content);
      const prisma = {
        receivedElectronicInvoice: {
          findFirst: jest.fn().mockResolvedValue({
            providerInvoiceId: '2184970',
            invoiceNumber: 'FACT-2026-0022',
            originalArchiveKey: 'archive-key',
            originalSha256: 'sha256',
            originalContentType: contentType,
            originalFileName: `original.${extension}`,
          }),
        },
      };
      const storage = {
        getArchivedFacturX: jest.fn().mockResolvedValue(original),
      };
      const oauth = { getAccessToken: jest.fn() };
      const fetchMock = jest.spyOn(global, 'fetch');
      const service = new SuperPdpIncomingInvoicesService(
        prisma as never,
        oauth as never,
        {} as never,
        storage as never,
        {} as never,
        {} as never,
      );

      const result = await service.downloadInvoice('company-1', 'incoming-1');

      expect(result).toEqual({
        buffer: original,
        contentType,
        fileName: `FACT-2026-0022.${extension}`,
      });
      expect(storage.getArchivedFacturX).toHaveBeenCalledWith(
        'archive-key',
        'sha256',
      );
      expect(oauth.getAccessToken).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('downloads the provider original when the archive is missing', async () => {
    const original = Buffer.from('<?xml version="1.0"?><Invoice/>');
    const prisma = {
      receivedElectronicInvoice: {
        findFirst: jest.fn().mockResolvedValue({
          providerInvoiceId: '2184970',
          invoiceNumber: 'FACT-2026-0022',
          originalArchiveKey: null,
        }),
      },
    };
    const oauth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    };
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(Uint8Array.from(original).buffer),
      headers: new Headers({ 'content-type': 'application/xml' }),
    } as Response);
    const service = new SuperPdpIncomingInvoicesService(
      prisma as never,
      oauth as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.downloadInvoice('company-1', 'incoming-1');

    expect(result).toEqual({
      buffer: original,
      contentType: 'application/xml',
      fileName: 'FACT-2026-0022.xml',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = fetchMock.mock.calls[0][0] as string;
    expect(requestUrl).toContain('/invoices/2184970/download');
  });

  it('offers a readable PDF while preserving the archived XML original', async () => {
    const xml = Buffer.from(
      '<?xml version="1.0"?><Invoice><ID>FACT-2026-0022</ID></Invoice>',
    );
    const prisma = {
      receivedElectronicInvoice: {
        findFirst: jest.fn().mockResolvedValue({
          providerInvoiceId: '2184970',
          invoiceNumber: 'FACT-2026-0022',
          originalArchiveKey: 'archive-key',
          originalSha256: 'sha256',
          originalContentType: 'application/xml',
        }),
      },
    };
    const storage = { getArchivedFacturX: jest.fn().mockResolvedValue(xml) };
    const pdf = Buffer.from('%PDF-readable');
    const renderer = { render: jest.fn().mockResolvedValue(pdf) };
    const service = new SuperPdpIncomingInvoicesService(
      prisma as never,
      {} as never,
      {} as never,
      storage as never,
      {} as never,
      renderer,
    );

    expect(
      await service.downloadInvoice('company-1', 'incoming-1', 'pdf'),
    ).toEqual({
      buffer: pdf,
      contentType: 'application/pdf',
      fileName: 'FACT-2026-0022-lecture.pdf',
    });
    expect(renderer.render).toHaveBeenCalledWith(xml);
    expect(
      await service.downloadInvoice('company-1', 'incoming-1', 'original'),
    ).toEqual({
      buffer: xml,
      contentType: 'application/xml',
      fileName: 'FACT-2026-0022.xml',
    });
  });

  it('returns the original PDF when the supplier invoice is already a PDF', async () => {
    const pdf = Buffer.from('%PDF-1.7\noriginal');
    const prisma = {
      receivedElectronicInvoice: {
        findFirst: jest.fn().mockResolvedValue({
          providerInvoiceId: '1',
          invoiceNumber: 'FACT-1',
          originalArchiveKey: 'key',
          originalContentType: 'application/pdf',
        }),
      },
    };
    const storage = { getArchivedFacturX: jest.fn().mockResolvedValue(pdf) };
    const renderer = { render: jest.fn() };
    const service = new SuperPdpIncomingInvoicesService(
      prisma as never,
      {} as never,
      {} as never,
      storage as never,
      {} as never,
      renderer,
    );

    expect(
      await service.downloadInvoice('company-1', 'incoming-1', 'pdf'),
    ).toEqual({
      buffer: pdf,
      contentType: 'application/pdf',
      fileName: 'FACT-1.pdf',
    });
    expect(renderer.render).not.toHaveBeenCalled();
  });
});
