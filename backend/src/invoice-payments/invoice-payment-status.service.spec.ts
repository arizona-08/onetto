import { InvoicePaymentStatusService } from './invoice-payment-status.service';

describe('InvoicePaymentStatusService', () => {
  it('retire le statut payé après un échec tardif sans envoyer de nouveau reçu', async () => {
    const prisma = {
      document: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'invoice-1', invoiceStatus: 'PAID' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          invoiceInstalmentPlan: {
            invoicePaymentInstalments: [
              { instalmentStatus: 'SUCCESS' },
              { instalmentStatus: 'FAILED' },
            ],
          },
          payByBankPayments: [],
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const mail = { sendMail: jest.fn() };
    const service = new InvoicePaymentStatusService(
      prisma as never,
      mail as never,
      { syncCollectedPaymentsForInvoice: jest.fn() } as never,
      {} as never,
      {} as never,
    );

    await service.refreshFromInstalment('invoice-1');

    expect(prisma.document.updateMany).toHaveBeenCalledWith({
      where: { id: 'invoice-1', invoiceStatus: 'PAID' },
      data: { invoiceStatus: 'PARTIALLY_PAID' },
    });
    expect(mail.sendMail).not.toHaveBeenCalled();
  });
  it('envoie un reçu du montant de l’échéance réglée', async () => {
    const prisma = {
      document: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'invoice-1', invoiceStatus: 'PENDING' })
          .mockResolvedValueOnce({
            clientName: 'Client',
            clientEmail: 'client@example.test',
            documentNumber: '#FACT-1',
            totalPrice: 120,
            company: { name: 'Onetto', email: 'contact@onetto.test' },
          }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValueOnce({
            invoiceInstalmentPlan: {
              invoicePaymentInstalments: [
                { instalmentStatus: 'SUCCESS' },
                { instalmentStatus: 'PENDING' },
              ],
            },
            payByBankPayments: [],
          })
          .mockResolvedValueOnce({
            clientName: 'Client',
            clientEmail: 'client@example.test',
            documentNumber: '#FACT-1',
            totalPrice: 120,
            company: { name: 'Onetto', email: 'contact@onetto.test' },
          }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const mail = {
      createPaymentReceiptMail: jest.fn().mockReturnValue({
        subject: 'Règlement reçu',
        text: 'Règlement reçu',
      }),
      sendMail: jest.fn().mockResolvedValue(undefined),
    };
    const ereporting = {
      syncCollectedPaymentsForInvoice: jest.fn().mockResolvedValue(undefined),
    };
    const service = new InvoicePaymentStatusService(
      prisma as never,
      mail as never,
      ereporting as never,
      {} as never,
      {} as never,
    );

    await service.refreshFromInstalment('invoice-1', 5000);

    expect(mail.createPaymentReceiptMail).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50, documentNumber: '#FACT-1' }),
    );
    expect(mail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'client@example.test' }),
    );
    expect(ereporting.syncCollectedPaymentsForInvoice).toHaveBeenCalledWith(
      'invoice-1',
    );
  });

  it('corrige une facture partiellement payée et ne confirme son solde qu’une fois', async () => {
    let currentStatus = 'PARTIALLY_PAID';
    const prisma = {
      document: {
        findUnique: jest.fn().mockImplementation(() =>
          Promise.resolve({
            id: 'invoice-1',
            invoiceStatus: currentStatus,
            companyId: 'company-1',
            documentNumber: 'F-1',
            totalPrice: 100,
          }),
        ),
        findUniqueOrThrow: jest
          .fn()
          .mockImplementation(
            (args: { select: { invoiceInstalmentPlan?: unknown } }) =>
              Promise.resolve(
                args.select.invoiceInstalmentPlan
                  ? {
                      invoiceInstalmentPlan: {
                        invoicePaymentInstalments: [
                          { instalmentStatus: 'SUCCESS' },
                          { instalmentStatus: 'SUCCESS' },
                        ],
                      },
                      payByBankPayments: [],
                    }
                  : {
                      clientName: 'Client',
                      clientEmail: 'client@example.test',
                      documentNumber: 'F-1',
                      totalPrice: 100,
                      company: { name: 'Onetto', email: 'contact@onetto.test' },
                    },
              ),
          ),
        updateMany: jest
          .fn()
          .mockImplementation((args: { where: { invoiceStatus: string } }) => {
            if (currentStatus !== args.where.invoiceStatus) {
              return Promise.resolve({ count: 0 });
            }
            currentStatus = 'PAID';
            return Promise.resolve({ count: 1 });
          }),
      },
    };
    const mail = {
      createPaymentConfirmationMail: jest.fn().mockReturnValue({
        subject: 'Facture réglée',
        text: 'Facture réglée',
      }),
      sendMail: jest.fn().mockResolvedValue(undefined),
    };
    const notifications = { notifyCompany: jest.fn() };
    const service = new InvoicePaymentStatusService(
      prisma as never,
      mail as never,
      { syncCollectedPaymentsForInvoice: jest.fn() } as never,
      notifications as never,
      {} as never,
    );

    await Promise.all([
      service.refreshFromInstalment('invoice-1'),
      service.refreshFromInstalment('invoice-1'),
    ]);

    expect(currentStatus).toBe('PAID');
    expect(mail.createPaymentConfirmationMail).toHaveBeenCalledTimes(1);
    expect(notifications.notifyCompany).toHaveBeenCalledTimes(1);
  });

  describe('notifications de règlement pour l’artisan', () => {
    function setup(options: { stage?: 'DEPOSIT' | 'BALANCE'; instalments?: boolean; fullyPaid?: boolean } = {}) {
      const document = {
        id: 'invoice-1', companyId: 'company-1', documentNumber: 'FACT-1',
        invoiceStatus: options.fullyPaid ? 'PARTIALLY_PAID' : 'PENDING',
        totalPrice: 120, clientName: 'Client', clientEmail: 'client@example.test',
        company: { name: 'Artisan', email: 'artisan@example.test' },
        contractStageInvoice: options.stage ? {
          kind: options.stage, sequence: 1, percentage: 30,
          plan: { estimate: { documentNumber: 'DEV-1' } },
        } : null,
        invoiceInstalmentPlan: options.instalments ? {
          _count: { invoicePaymentInstalments: 2 },
          invoicePaymentInstalments: [{ instalmentNumber: options.fullyPaid ? 2 : 1, amountInCents: 6000 }],
        } : null,
      };
      const prisma = {
        document: {
          findUnique: jest.fn().mockImplementation((args) => Promise.resolve(
            args.select.companyId ? { ...document, invoiceStatus: options.fullyPaid ? 'PAID' : 'PARTIALLY_PAID' } : document,
          )),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            ...document,
            payByBankPayments: [{ status: 'SUCCESS' }],
            invoiceInstalmentPlan: options.instalments ? {
              invoicePaymentInstalments: [
                { instalmentStatus: 'SUCCESS' },
                { instalmentStatus: options.fullyPaid ? 'SUCCESS' : 'PENDING' },
              ],
            } : null,
          }),
          update: jest.fn(),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        payByBankPayment: {
          findUnique: jest.fn().mockResolvedValue({ invoiceId: 'invoice-1' }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({ payByBankPaymentAttempts: [{ paymentStatus: 'SUCCESS' }] }),
          update: jest.fn(),
        },
      };
      const mail = {
        createPaymentReceiptMail: jest.fn().mockReturnValue({ subject: 'Reçu', text: 'Reçu' }),
        createPaymentConfirmationMail: jest.fn().mockReturnValue({ subject: 'Confirmation', text: 'Confirmation' }),
        sendMail: jest.fn(),
      };
      const notifications = { notifyCompany: jest.fn() };
      const service = new InvoicePaymentStatusService(
        prisma as never, mail as never,
        { syncCollectedPaymentsForInvoice: jest.fn() } as never,
        notifications as never, { reportContractStagePayment: jest.fn() } as never,
      );
      return { service, notifications };
    }

    it.each([false, true])('précise l’échéance réglée et le paiement complet : %s', async (fullyPaid) => {
      const { service, notifications } = setup({ instalments: true, fullyPaid });
      await service.refreshFromInstalment('invoice-1', 6000, 'instalment-1');

      expect(notifications.notifyCompany).toHaveBeenCalledTimes(1);
      expect(notifications.notifyCompany).toHaveBeenCalledWith(expect.objectContaining({
        title: `Échéance n° ${fullyPaid ? 2 : 1}/2 réglée`,
        message: expect.stringContaining('60,00'),
        href: '/documents/invoice-1',
        deduplicationKey: 'payment:invoice-1:instalment:instalment-1:confirmed',
      }));
      const message = notifications.notifyCompany.mock.calls[0][0].message;
      expect(message).toContain('FACT-1');
      expect(message.includes('intégralement réglée')).toBe(fullyPaid);
    });

    it.each(['DEPOSIT', 'BALANCE'] as const)('précise le règlement contractuel %s et le devis associé', async (stage) => {
      const { service, notifications } = setup({ stage });
      await service.syncContractPaymentResult('invoice-1', 'PENDING', 'SUCCESS', 'PM1');

      expect(notifications.notifyCompany).toHaveBeenCalledWith(expect.objectContaining({
        title: stage === 'DEPOSIT' ? 'Acompte n° 1 réglé' : 'Solde réglé',
        message: expect.stringContaining('DEV-1'),
      }));
      expect(notifications.notifyCompany.mock.calls[0][0].message).toContain('FACT-1');
    });

    it('identifie une facture à paiement unique', async () => {
      const { service, notifications } = setup();
      await service.refreshFromPaymentAttempt('payment-1', true);

      expect(notifications.notifyCompany).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Facture réglée — paiement unique',
        message: expect.stringContaining('FACT-1'),
      }));
    });
  });
});
