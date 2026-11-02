import { describe, expect, it } from '@jest/globals';
import { FacturXService } from './factur-x.service';

const invoice = {
  id: 'invoice-1',
  documentNumber: '#FACT-2026-0001',
  clientType: 'INDIVIDUAL',
  clientName: 'Marie Dupont',
  clientEmail: 'marie@example.test',
  clientAddress: '1 rue du Test',
  clientCity: 'Paris',
  clientPostalCode: '75001',
  clientCountry: 'France',
  clientElectronicAddress: null,
  clientElectronicAddressScheme: null,
  clientSiren: null,
  clientVatNumber: null,
  currencyCode: 'EUR',
  operationNature: 'SERVICES',
  paymentDueAt: new Date('2026-11-15'),
  createdAt: new Date('2026-10-23'),
  sentAt: null,
  totalPriceExcludingTax: 100,
  totalPrice: 120,
  services: [
    {
      description: 'Prestation',
      quantity: 1,
      unitPrice: 100,
      taxRate: 20,
    },
  ],
  company: {
    name: 'Atelier Test',
    address: '2 rue du Test',
    city: 'Paris',
    postalCode: '75002',
    country: 'France',
    siren: '123456789',
    electronicAddress: '123456789',
    electronicAddressScheme: 'SIREN',
    subjectToVat: true,
    vatNumber: 'FR123456789',
  },
};

describe('FacturXService buyer address', () => {
  const service = new FacturXService(
    null as never,
    null as never,
    null as never,
    null as never,
  );

  it('uses the individual buyer email with the EM scheme for Factur-X', () => {
    const result = service['toEn16931'](invoice);

    expect(result.buyer.electronic_address).toEqual({
      value: 'marie@example.test',
      scheme: 'EM',
    });
    expect(result.buyer).not.toHaveProperty('legal_registration_identifier');
    expect(result.buyer).not.toHaveProperty('vat_identifier');
  });

  it('keeps the business buyer routing address', () => {
    const result = service['toEn16931']({
      ...invoice,
      clientType: 'BUSINESS',
      clientElectronicAddress: '123456789',
      clientElectronicAddressScheme: '0225',
      clientSiren: '123456789',
      clientVatNumber: 'FR123456789',
    });

    expect(result.buyer.electronic_address).toEqual({
      value: '123456789',
      scheme: '0225',
    });
    expect(result.buyer.legal_registration_identifier).toEqual({
      value: '123456789',
      scheme: '0002',
    });
  });
});
