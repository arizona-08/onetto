import { InvoicePaymentStatusService } from './invoice-payment-status.service';

describe('InvoicePaymentStatusService', () => {
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
            invoicePaymentInstalmentPlan: {
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
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const mail = {
      createPaymentReceiptMail: jest.fn().mockReturnValue({
        subject: 'Règlement reçu',
        text: 'Règlement reçu',
      }),
      sendMail: jest.fn().mockResolvedValue(undefined),
    };
    const service = new InvoicePaymentStatusService(
      prisma as never,
      mail as never,
    );

    await service.refreshFromInstalment('invoice-1', 5000);

    expect(mail.createPaymentReceiptMail).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50, documentNumber: '#FACT-1' }),
    );
    expect(mail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'client@example.test' }),
    );
  });
});
