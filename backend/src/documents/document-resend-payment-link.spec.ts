jest.mock('gocardless-nodejs', () => ({
  Environments: {},
  GoCardlessClient: jest.fn(),
}));

import { DocumentService } from './document.service';

describe('DocumentService — renvoi du lien de paiement', () => {
  const user = { id: 'owner-1' } as never;
  const invoice = {
    id: 'invoice-1',
    type: 'INVOICE',
    sentAt: new Date('2026-01-01'),
    invoiceStatus: 'PENDING',
    companyId: 'company-1',
    contractStageInvoice: null,
    clientName: 'Client',
    clientEmail: 'client@example.test',
    documentNumber: '#FACT-1',
    totalPrice: 120,
    paymentDueAt: new Date('2026-02-01'),
    services: [],
  };
  const mail = {
    createInvoicePaymentLinkResendMail: jest.fn().mockReturnValue({
      subject: 'Lien de paiement',
      text: 'Lien',
      html: '<p>Lien</p>',
    }),
    sendMail: jest.fn(),
  };
  const pdf = {
    generate: jest.fn().mockResolvedValue(Buffer.from('%PDF-test')),
  };
  const provider = { getCurrentOneTimeFlow: jest.fn() };
  const service = Object.create(DocumentService.prototype) as DocumentService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(service, 'getDocumentById').mockResolvedValue(invoice as never);
    jest.spyOn(service, 'isCompanyUser').mockResolvedValue(true);
    jest.spyOn(service, 'getPaymentModeDetails').mockResolvedValue({
      paymentMode: 'ONE_TIME',
      instalmentsDetails: undefined,
    } as never);
    jest.spyOn(service as never, 'getInvoiceCompany').mockResolvedValue({
      id: 'company-1',
      name: 'Atelier',
      email: 'atelier@example.test',
    } as never);
    provider.getCurrentOneTimeFlow.mockResolvedValue({
      url: 'https://pay.example/flow',
      accessToken: 'new-token',
    });
    Reflect.set(service, 'gocardlessProvider', provider);
    Reflect.set(service, 'mailService', mail);
    Reflect.set(service, 'pdfService', pdf);
    Reflect.set(service, 'configService', {
      get: jest.fn().mockReturnValue('https://onetto.test'),
    });
  });

  it.each(['PENDING', 'OVERDUE'] as const)(
    'renvoie un lien pour une facture %s sans changer son statut',
    async (status) => {
      jest.spyOn(service, 'getDocumentById').mockResolvedValue({
        ...invoice,
        invoiceStatus: status,
      } as never);
      await service.resendInvoicePaymentLink(invoice.id, user);
      expect(provider.getCurrentOneTimeFlow).toHaveBeenCalledWith(invoice.id, {
        renewPublicAccess: true,
      });
      expect(mail.createInvoicePaymentLinkResendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentLink: 'https://onetto.test/payment?token=new-token',
        }),
      );
      expect(mail.sendMail).toHaveBeenCalledTimes(1);
    },
  );

  it('ne renvoie rien si un paiement est déjà engagé', async () => {
    provider.getCurrentOneTimeFlow.mockResolvedValue({
      url: null,
      message: 'Un paiement est déjà engagé.',
    });
    await expect(
      service.resendInvoicePaymentLink(invoice.id, user),
    ).rejects.toThrow('déjà engagé');
    expect(mail.sendMail).not.toHaveBeenCalled();
  });

  it('refuse une facture payée', async () => {
    jest.spyOn(service, 'getDocumentById').mockResolvedValue({
      ...invoice,
      invoiceStatus: 'PAID',
    } as never);
    await expect(
      service.resendInvoicePaymentLink(invoice.id, user),
    ).rejects.toThrow('en attente ou échue');
    expect(provider.getCurrentOneTimeFlow).not.toHaveBeenCalled();
  });
});
