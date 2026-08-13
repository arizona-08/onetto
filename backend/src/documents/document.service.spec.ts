import { BadRequestException } from '@nestjs/common';
import { DocumentService } from './document.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BridgeApiService } from 'src/bridgeApi/bridgeApi.service';
import { InvoicePaymentFeeService } from './invoice-payment-fee.service';

const user = { id: 'user-1', firstname: 'Ada', lastname: 'Lovelace', email: 'ada@example.test', sub: 'user-1', iat: 0, exp: 0, role: 'BASIC_USER' };
const dto = {
  client: { name: 'Client modifié', email: 'modified@example.test', address: 'Rue modifiée', city: 'Lyon', postalCode: '69000', country: 'France' },
  lineItems: [{ description: 'Prestation modifiée', quantity: 3, taxRate: 20, unitPrice: 99, unit: 'jour' }],
  documentDates: { dueDate: '2026-09-15' },
};
const invoice = {
  id: 'invoice-1', companyId: 'company-1', type: 'INVOICE', invoiceStatus: 'DRAFT', estimateStatus: 'DRAFT', documentNumber: '#FACT-2026-0001',
  clientName: 'Client initial', clientEmail: 'client@example.test', clientAddress: '1 rue du Test', clientCity: 'Paris', clientPostalCode: '75001', clientCountry: 'France', totalPrice: 120, totalPriceExcludingTax: 100,
  paymentDueAt: new Date('2026-09-01'), sentAt: null, services: [{ id: 'line-1', description: 'Prestation', quantity: 1, taxRate: 20, unitPrice: 100, unit: 'jour', totalPrice: 120, wtPrice: 100, documentId: 'invoice-1' }],
};
const company = { name: 'Atelier Onetto', email: 'contact@onetto.test', phoneNumber: '0102030405', siren: '123456789', address: '10 rue Onetto', postalCode: '75002', city: 'Paris', country: 'France', vatNumber: 'FR123', IBAN: 'FR761234', BIC: 'ABCDFRPP' };

describe('DocumentService', () => {
  let service: DocumentService;
  const prisma = {
    document: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    invoicePaymentFee: {
      findUnique: jest.fn(),
      aggregate: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    company: { findUnique: jest.fn() },
    estimateNegociation: { create: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const mail = {
    sendMail: jest.fn(),
    createInvoiceMail: jest.fn().mockReturnValue({ subject: 'Facture', text: 'facture', html: '<p>Facture</p>' }),
    createInvoicePaymentRetryMail: jest.fn().mockReturnValue({ subject: 'Relance', text: 'relance', html: '<p>Relance</p>' }),
    createEstimateMail: jest.fn().mockReturnValue({ subject: 'Devis', text: 'devis', html: '<p>Devis</p>' }),
  } as unknown as MailService;
  const pdf = { generate: jest.fn() } as unknown as InvoicePdfService;
  const bridge = { getCallbackUrl: jest.fn().mockReturnValue('https://callback.test'), createPaymentLink: jest.fn().mockResolvedValue({ url: 'https://pay.test/link' }) } as unknown as BridgeApiService;
  const paymentFee = {
    createForPaidInvoice: jest.fn(),
    resetForPendingInvoice: jest.fn(),
  } as unknown as InvoicePaymentFeeService;

  beforeEach(() => {
    jest.resetAllMocks();
    (mail.createInvoiceMail as jest.Mock).mockReturnValue({ subject: 'Facture', text: 'facture', html: '<p>Facture</p>' });
    (mail.createInvoicePaymentRetryMail as jest.Mock).mockReturnValue({ subject: 'Relance', text: 'relance', html: '<p>Relance</p>' });
    (mail.createEstimateMail as jest.Mock).mockReturnValue({ subject: 'Devis', text: 'devis', html: '<p>Devis</p>' });
    (bridge.getCallbackUrl as jest.Mock).mockReturnValue('https://callback.test');
    (bridge.createPaymentLink as jest.Mock).mockResolvedValue({ url: 'https://pay.test/link' });
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(prisma));
    service = new DocumentService(prisma, mail, pdf, bridge, paymentFee);
    jest.spyOn(service, 'getDocumentById').mockResolvedValue(invoice as never);
    jest.spyOn(service, 'isCompanyUser').mockResolvedValue(true);
    jest.spyOn(service as never, 'getActiveCompanyId').mockResolvedValue('company-1');
  });

  it('ne modifie que la date d’échéance d’une facture brouillon', async () => {
    (prisma.document.findFirst as jest.Mock).mockResolvedValue(invoice);
    (prisma.document.update as jest.Mock).mockResolvedValue(invoice);

    await service.updateDraftDocument(invoice.id, dto, user);

    expect(prisma.document.update).toHaveBeenCalledWith({ where: { id: invoice.id }, data: { paymentDueAt: new Date('2026-09-15') } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuse de modifier une facture déjà envoyée', async () => {
    (prisma.document.findFirst as jest.Mock).mockResolvedValue({ ...invoice, invoiceStatus: 'SENT' });

    await expect(service.updateDraftDocument(invoice.id, dto, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.document.update).not.toHaveBeenCalled();
  });

  it('lie une facture créée au devis source avec sourceDocumentId', async () => {
    const acceptedEstimate = {
      ...invoice,
      id: 'estimate-1',
      type: 'ESTIMATE',
      estimateStatus: 'ACCEPTED',
      convertedDocuments: [],
    };
    (prisma.document.findFirst as jest.Mock).mockResolvedValue(acceptedEstimate);
    (prisma.document.create as jest.Mock).mockResolvedValue({ id: 'invoice-2' });
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback({
      documentService: { create: jest.fn() },
    }));
    jest.spyOn(service, 'createDocumentNumber').mockResolvedValue('#FACT-2026-0002');

    await service.convertEstimateToInvoice(acceptedEstimate.id, user);

    expect(prisma.document.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sourceDocumentId: acceptedEstimate.id }),
    }));
  });

  it('empêche une seconde conversion du même devis', async () => {
    (prisma.document.findFirst as jest.Mock).mockResolvedValue({
      ...invoice,
      type: 'ESTIMATE',
      estimateStatus: 'ACCEPTED',
      convertedDocuments: [{ id: 'invoice-2' }],
    });

    await expect(service.convertEstimateToInvoice('estimate-1', user)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it('envoie une facture brouillon avec son PDF puis la marque SENT', async () => {
    const pdfBuffer = Buffer.from('%PDF-test');
    (prisma.company.findUnique as jest.Mock).mockResolvedValue(company);
    (pdf.generate as jest.Mock).mockResolvedValue(pdfBuffer);

    await service.sendDocumentToClient(invoice.id, user);

    expect(pdf.generate).toHaveBeenCalledWith(expect.objectContaining({ company, documentNumber: invoice.documentNumber }));
    expect(mail.createInvoiceMail).toHaveBeenCalledWith(expect.objectContaining({
      paymentLink: expect.stringContaining('/payment?token='),
    }));
    expect(mail.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: invoice.clientEmail, attachments: [expect.objectContaining({ content: pdfBuffer, contentType: 'application/pdf' })] }));
    expect(prisma.estimateNegociation.create).not.toHaveBeenCalled();
    expect(prisma.document.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ invoiceStatus: 'SENT', sentAt: expect.any(Date) }) }));
  });

  it('ne marque pas une facture comme envoyée si la génération PDF échoue', async () => {
    (prisma.company.findUnique as jest.Mock).mockResolvedValue(company);
    (pdf.generate as jest.Mock).mockRejectedValue(new Error('PDF indisponible'));

    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    await expect(service.sendDocumentToClient(invoice.id, user)).rejects.toThrow("Une erreur est survenue lors de l'envoi du document au client.");
    consoleError.mockRestore();
    expect(mail.sendMail).not.toHaveBeenCalled();
    expect(prisma.document.update).not.toHaveBeenCalled();
  });

  it('refuse un second envoi de facture', async () => {
    jest.spyOn(service, 'getDocumentById').mockResolvedValue({ ...invoice, invoiceStatus: 'SENT' } as never);

    await expect(service.sendDocumentToClient(invoice.id, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(mail.sendMail).not.toHaveBeenCalled();
  });

  it('génère un nouveau lien et envoie un email de relance pour une facture rejetée', async () => {
    const pdfBuffer = Buffer.from('%PDF-test');
    jest.spyOn(service, 'getDocumentById').mockResolvedValue({ ...invoice, invoiceStatus: 'REJECTED' } as never);
    (prisma.company.findUnique as jest.Mock).mockResolvedValue(company);
    (pdf.generate as jest.Mock).mockResolvedValue(pdfBuffer);

    await service.retryInvoicePayment(invoice.id, user);

    expect(bridge.createPaymentLink).toHaveBeenCalled();
    expect(mail.createInvoicePaymentRetryMail).toHaveBeenCalledWith(expect.objectContaining({
      paymentLink: expect.stringContaining('/payment?token='),
    }));
    expect(mail.sendMail).toHaveBeenCalledWith(expect.objectContaining({ attachments: [expect.objectContaining({ content: pdfBuffer })] }));
    expect(prisma.document.update).toHaveBeenCalledWith({ where: { id: invoice.id }, data: { invoiceStatus: 'SENT' } });
  });

  it('refuse une relance si la facture n’est pas rejetée', async () => {
    await expect(service.retryInvoicePayment(invoice.id, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(bridge.createPaymentLink).not.toHaveBeenCalled();
  });

  it('marque manuellement comme payée une facture en attente', async () => {
    (prisma.document.findUnique as jest.Mock).mockResolvedValue({
      type: 'INVOICE',
      invoiceStatus: 'PENDING',
      companyId: 'company-1',
    });
    (prisma.document.update as jest.Mock).mockResolvedValue(invoice);

    await service.manuallyMarkInvoiceAsPaid(invoice.id, user);

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: invoice.id },
      data: { invoiceStatus: 'PAID_MANUALLY' },
    });
    expect(paymentFee.createForPaidInvoice).toHaveBeenCalledWith(
      invoice.id,
      'company-1',
      prisma,
    );
  });

  it('remet en attente une facture payée manuellement', async () => {
    (prisma.document.findUnique as jest.Mock).mockResolvedValue({
      type: 'INVOICE',
      invoiceStatus: 'PAID_MANUALLY',
      companyId: 'company-1',
    });
    (prisma.document.update as jest.Mock).mockResolvedValue(invoice);

    await service.manuallyMarkInvoiceAsPending(invoice.id, user);

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: invoice.id },
      data: { invoiceStatus: 'PENDING' },
    });
    expect(paymentFee.resetForPendingInvoice).toHaveBeenCalledWith(
      invoice.id,
      prisma,
    );
  });

  it('envoie un devis avec un token de négociation et le template HTML dédié', async () => {
    const estimate = { ...invoice, id: 'estimate-1', type: 'ESTIMATE', documentNumber: '#DEV-2026-0001' };
    jest.spyOn(service, 'getDocumentById').mockResolvedValue(estimate as never);
    (prisma.estimateNegociation.create as jest.Mock).mockResolvedValue({ negociationToken: 'secure-token' });

    await service.sendDocumentToClient(estimate.id, user);

    expect(prisma.estimateNegociation.create).toHaveBeenCalled();
    expect(mail.createEstimateMail).toHaveBeenCalledWith(expect.objectContaining({ documentUrl: expect.stringContaining('secure-token') }));
    expect(mail.sendMail).toHaveBeenCalledWith(expect.objectContaining({ attachments: undefined }));
    expect(prisma.document.update).toHaveBeenCalledWith({ where: { id: estimate.id }, data: { estimateStatus: 'SENT' } });
  });
});
