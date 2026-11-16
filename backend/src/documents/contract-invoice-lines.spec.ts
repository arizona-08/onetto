import { buildContractInvoiceLines } from './contract-invoice-lines';

const deposits = [
  { percentage: 25, triggerCondition: 'À la commande' },
  { percentage: 25, triggerCondition: 'À mi-parcours' },
];

describe('contract invoice lines', () => {
  it('keeps the agreed gross total across two deposits and a balance', () => {
    const source = [
      { description: 'Service', unitPrice: 1000, quantity: 1, taxRate: 20, itemType: 'SERVICES' as const },
    ];
    const invoices = [0, 1, 2].map((index) =>
      buildContractInvoiceLines(source, 120000, deposits, index),
    );
    expect(invoices.map((invoice) => invoice.totalPrice)).toEqual([300, 300, 600]);
    expect(invoices.reduce((sum, invoice) => sum + Math.round(invoice.totalPrice * 100), 0)).toBe(120000);
    expect(invoices.map((invoice) => invoice.totalPriceExcludingTax)).toEqual([250, 250, 500]);
  });

  it('preserves separate VAT rates and rounds to the contractual cents', () => {
    const source = [
      { description: 'Service à 20 %', unitPrice: 100, quantity: 1, taxRate: 20, itemType: 'SERVICES' as const },
      { description: 'Service à 10 %', unitPrice: 100, quantity: 1, taxRate: 10, itemType: 'SERVICES' as const },
    ];
    const invoices = [0, 1, 2].map((index) => buildContractInvoiceLines(source, 23000, deposits, index));
    expect(invoices.reduce((sum, invoice) => sum + Math.round(invoice.totalPrice * 100), 0)).toBe(23000);
    expect(invoices.every((invoice) => invoice.lines.length === 2)).toBe(true);
    expect(invoices[0].lines.map((line) => line.taxRate)).toEqual([20, 10]);
  });

  it('supports franchise en base with a non divisible cent amount', () => {
    const source = [
      { description: 'Service', unitPrice: 100.01, quantity: 1, taxRate: 0, itemType: 'SERVICES' as const },
    ];
    const invoices = [0, 1, 2].map((index) => buildContractInvoiceLines(source, 10001, deposits, index));
    expect(invoices.map((invoice) => Math.round(invoice.totalPrice * 100))).toEqual([2500, 2500, 5001]);
  });

  it('keeps cent accuracy for common VAT amounts that are not divisible by four', () => {
    const amount = 100.03;
    const source = [{ description: 'Service', unitPrice: amount, quantity: 1, taxRate: 20, itemType: 'SERVICES' as const }];
    const grossCents = Math.round(amount * 120);
    const invoices = [0, 1, 2].map((index) => buildContractInvoiceLines(source, grossCents, deposits, index));
    expect(invoices.reduce((sum, invoice) => sum + Math.round(invoice.totalPrice * 100), 0)).toBe(grossCents);
  });
});
