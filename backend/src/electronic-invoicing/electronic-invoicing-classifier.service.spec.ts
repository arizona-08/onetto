import { ElectronicInvoicingClassifierService } from './electronic-invoicing-classifier.service';

describe('ElectronicInvoicingClassifierService', () => {
  const service = new ElectronicInvoicingClassifierService();
  const base = {
    sellerCountry: 'FR',
    clientCountry: 'FR',
    clientType: 'BUSINESS' as const,
    clientIsVatTaxable: true,
    operationNature: 'SERVICES' as const,
    isVatExempt: false,
    isOutOfScope: false,
    vatDueOnCollection: false,
  };

  it('classifies a French B2B taxable sale as electronic invoicing', () => {
    expect(service.classify(base)).toMatchObject({
      flow: 'B2B_FR',
      requiresElectronicInvoice: true,
      requiresTransactionReporting: false,
    });
  });

  it('classifies a French B2C sale as transaction reporting', () => {
    expect(
      service.classify({ ...base, clientType: 'INDIVIDUAL' }),
    ).toMatchObject({
      flow: 'B2C_FR',
      requiresTransactionReporting: true,
      requiresPaymentReporting: false,
    });
  });

  it('requires payment reporting for a B2C sale with VAT due on collection', () => {
    expect(
      service.classify({
        ...base,
        clientType: 'INDIVIDUAL',
        vatDueOnCollection: true,
      }),
    ).toMatchObject({
      flow: 'B2C_FR',
      requiresPaymentReporting: true,
    });
  });

  it('classifies an international taxable B2B sale as e-reporting', () => {
    expect(
      service.classify({
        ...base,
        clientCountry: 'BE',
        clientType: 'FOREIGN',
      }),
    ).toMatchObject({
      flow: 'B2B_INTERNATIONAL',
      requiresTransactionReporting: true,
    });
  });

  it('routes a French public body to Chorus Pro', () => {
    expect(
      service.classify({ ...base, clientType: 'PUBLIC_BODY' }),
    ).toMatchObject({ flow: 'B2G', requiresElectronicInvoice: false });
  });

  it('does not infer a report for an exempt operation', () => {
    expect(service.classify({ ...base, isVatExempt: true })).toMatchObject({
      flow: 'EXEMPT',
      requiresTransactionReporting: false,
    });
  });
});
