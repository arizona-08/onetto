import { InvoicePdfService } from './invoice-pdf.service';

describe('InvoicePdfService', () => {
  it('génère un PDF non vide pour une facture complète', async () => {
    const pdf = await new InvoicePdfService().generate({
      documentNumber: '#FACT-2026-0001', sentAt: new Date('2026-08-11'), paymentDueAt: new Date('2026-09-11'), clientName: 'Client', clientEmail: 'client@example.test', clientAddress: '1 rue du Test', clientPostalCode: '75001', clientCity: 'Paris', clientCountry: 'France', totalPrice: 120, totalPriceExcludingTax: 100,
      services: [{ description: 'Conseil', quantity: 1, unit: 'jour', unitPrice: 100, taxRate: 20, totalPrice: 120 }],
      company: { name: 'Onetto', email: 'contact@onetto.test', phoneNumber: '0102030405', siren: '123456789', address: '10 rue Onetto', postalCode: '75002', city: 'Paris', country: 'France', vatNumber: 'FR123', IBAN: 'FR761234', BIC: 'ABCDFRPP' },
    });

    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1_000);
  });
});
