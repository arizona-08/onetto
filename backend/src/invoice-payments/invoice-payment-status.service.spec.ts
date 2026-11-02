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
    );

    await Promise.all([
      service.refreshFromInstalment('invoice-1'),
      service.refreshFromInstalment('invoice-1'),
    ]);

    expect(currentStatus).toBe('PAID');
    expect(mail.createPaymentConfirmationMail).toHaveBeenCalledTimes(1);
    expect(notifications.notifyCompany).toHaveBeenCalledTimes(1);
  });
});
