import { SupplierInvoicePdfService } from './supplier-invoice-pdf.service';

describe('SupplierInvoicePdfService', () => {
  const service = new SupplierInvoicePdfService();

  it('renders a readable PDF from a received UBL invoice', async () => {
    const xml = Buffer.from(`<?xml version="1.0"?>
      <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
        xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
        xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
        <cbc:ID>FACT-2026-0022</cbc:ID>
        <cbc:IssueDate>2026-11-18</cbc:IssueDate>
        <cbc:DueDate>2026-11-25</cbc:DueDate>
        <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
        <cac:AccountingSupplierParty><cac:Party>
          <cac:PartyName><cbc:Name>Burger Queen</cbc:Name></cac:PartyName>
        </cac:Party></cac:AccountingSupplierParty>
        <cac:AccountingCustomerParty><cac:Party>
          <cac:PartyName><cbc:Name>Tricatel</cbc:Name></cac:PartyName>
        </cac:Party></cac:AccountingCustomerParty>
        <cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity>2</cbc:InvoicedQuantity>
          <cbc:LineExtensionAmount>100.00</cbc:LineExtensionAmount>
          <cac:Item><cbc:Name>Prestation</cbc:Name></cac:Item>
          <cac:Price><cbc:PriceAmount>50.00</cbc:PriceAmount></cac:Price>
        </cac:InvoiceLine>
        <cac:TaxTotal><cbc:TaxAmount>20.00</cbc:TaxAmount></cac:TaxTotal>
        <cac:LegalMonetaryTotal><cbc:TaxExclusiveAmount>100.00</cbc:TaxExclusiveAmount>
          <cbc:TaxInclusiveAmount>120.00</cbc:TaxInclusiveAmount>
          <cbc:PayableAmount>120.00</cbc:PayableAmount>
        </cac:LegalMonetaryTotal>
      </Invoice>`);

    const pdf = await service.render(xml);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('rejects an XML document without invoice identity', async () => {
    await expect(service.render(Buffer.from('<Invoice/>'))).rejects.toThrow(
      'ne peut pas être représentée',
    );
  });
});
