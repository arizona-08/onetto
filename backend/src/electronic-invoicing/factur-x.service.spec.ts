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

  it('keeps the seller legal identity separate from its Peppol routing address', () => {
    const result = service['toEn16931']({
      ...invoice,
      company: { ...invoice.company, siren: '000000002', electronicAddress: '0225:315143296_99999', electronicAddressScheme: 'PEPPOL' },
    }, 'peppol');
    expect(result.seller.legal_registration_identifier).toEqual({ value: '000000002', scheme: '0002' });
    expect(result.seller.electronic_address).toEqual({ value: '315143296_99999', scheme: '0225' });
  });

  it('rejects a sandbox company number used as a Peppol address', () => {
    expect(() => service['toEn16931']({
      ...invoice, company: { ...invoice.company, electronicAddress: '000000002', electronicAddressScheme: 'PEPPOL' },
    })).toThrow('schéma et l’identifiant');
  });

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

  it('marks a contract deposit as type 386 with the deposit process', () => {
    const result = service['toEn16931']({
      ...invoice,
      contractStageInvoice: {
        kind: 'DEPOSIT', sequence: 1, percentage: 25,
        plan: { estimate: { documentNumber: '#DEV-2026-0001' } },
      },
    });
    expect(result.type_code).toBe(386);
    expect(result.process_control.business_process_type).toBe('S1');
    expect(result.sales_order_reference).toBe('DEV-2026-0001');
  });

  it.each([
    ['GOODS', 'B1'],
    ['MIXED', 'M1'],
  ])('uses the ordinary %s process for a deposit', (operationNature, expectedProcess) => {
    const result = service['toEn16931']({
      ...invoice,
      operationNature,
      contractStageInvoice: {
        kind: 'DEPOSIT', sequence: 1, percentage: 25,
        plan: { estimate: { documentNumber: '#DEV-2026-0001' } },
      },
    });
    expect(result.type_code).toBe(386);
    expect(result.process_control.business_process_type).toBe(expectedProcess);
  });

  it('deducts paid deposits and references their issued invoices on the final invoice', () => {
    const deposit = {
      documentNumber: '#FACT-2026-0001', totalPrice: 30,
      invoiceStatus: 'PAID', sentAt: new Date('2026-10-25'), createdAt: new Date('2026-10-24'),
    };
    const result = service['toEn16931']({
      ...invoice,
      documentNumber: '#FACT-2026-0002',
      totalPrice: 90,
      totalPriceExcludingTax: 75,
      contractStageInvoice: {
        kind: 'BALANCE', sequence: 2, percentage: 75,
        plan: {
          totalAmountInCents: 12000,
          estimate: { documentNumber: '#DEV-2026-0001', totalPriceExcludingTax: 100, services: invoice.services },
          stages: [{ kind: 'DEPOSIT', invoice: deposit }, { kind: 'BALANCE', invoice: null }],
        },
      },
    });
    expect(result.type_code).toBe(380);
    expect(result.process_control.business_process_type).toBe('S4');
    expect(result.totals).toMatchObject({ total_with_vat: '120.00', paid_amount: '30.00', amount_due_for_payment: '90.00' });
    expect(result.preceding_invoice_references).toEqual([{
      reference: 'FACT-2026-0001', issue_date: '2026-10-25', preceding_invoice_type_code: 386,
    }]);
  });
});
