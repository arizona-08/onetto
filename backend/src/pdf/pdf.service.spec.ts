import { PdfService } from './pdf.service';
import sharp from 'sharp';

describe('PdfService', () => {
  it('génère un PDF non vide pour une facture complète', async () => {
    const invoice = {
      type: 'INVOICE',
      documentNumber: '#FACT-2026-0001',
      createdAt: new Date('2026-08-11'),
      sentAt: new Date('2026-08-11'),
      paymentDueAt: new Date('2026-09-11'),
      clientName: 'Client',
      clientEmail: 'client@example.test',
      clientAddress: '1 rue du Test',
      clientPostalCode: '75001',
      clientCity: 'Paris',
      clientCountry: 'France',
      clientType: 'BUSINESS',
      clientSiren: '123456789',
      clientVatNumber: 'FR00123456789',
      totalPrice: 120,
      totalPriceExcludingTax: 100,
      services: [
        {
          description: 'Conseil',
          quantity: 1,
          unit: 'jour',
          unitPrice: 100,
          taxRate: 20,
          totalPrice: 120,
        },
      ],
      company: {
        name: 'Onetto',
        email: 'contact@onetto.test',
        phoneNumber: '0102030405',
        siren: '123456789',
        address: '10 rue Onetto',
        postalCode: '75002',
        city: 'Paris',
        country: 'France',
        vatNumber: 'FR123',
        bank: 'Banque de test',
        IBAN: 'FR761234',
        BIC: 'ABCDFRPP',
      },
    } as const;
    const pdfService = new PdfService({ getCompanyLogo: jest.fn() } as never);
    const pdf = await pdfService.generate({
      ...invoice,
      services: [...invoice.services],
    });

    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1_000);

    const logo = await sharp({
      create: { width: 120, height: 40, channels: 4, background: '#454ade' },
    })
      .png()
      .toBuffer();
    const brandedPdf = await new PdfService({
      getCompanyLogo: jest.fn().mockResolvedValue(logo),
    } as never).generate({
      ...invoice,
      services: [...invoice.services],
      company: {
        ...invoice.company,
        id: 'company-1',
        logo: {
          s3Key: 'companies/company-1/logos/logo.png',
          contentType: 'image/png',
        },
      },
    });
    expect(brandedPdf.subarray(0, 4).toString()).toBe('%PDF');

    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="blue"/></svg>',
    );
    const s3Pdf = await new PdfService({
      getCompanyLogo: jest.fn().mockResolvedValue(svg),
    } as never).generate({
      ...invoice,
      services: [...invoice.services],
      company: {
        ...invoice.company,
        id: 'company-1',
        logo: {
          s3Key: 'companies/company-1/logos/logo.svg',
          contentType: 'image/svg+xml',
        },
      },
    });
    expect(s3Pdf.subarray(0, 4).toString()).toBe('%PDF');

    const longPdf = await pdfService.generate({
      ...invoice,
      services: Array.from({ length: 16 }, (_, index) => ({
        ...invoice.services[0],
        description: `Prestation ${index + 1}`,
      })),
    });
    expect(
      longPdf.toString('latin1').match(/\/Type \/Page\b/g)?.length,
    ).toBeGreaterThan(1);
  });
});
