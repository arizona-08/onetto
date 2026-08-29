import { ReminderType } from '@prisma/client';
import { AutomaticRemindersService } from './automatic-reminders.service';

const reminderTypes: ReminderType[] = [
  'ESTIMATE_PENDING',
  'ESTIMATE_PENDING_BEFORE_DUE_DATE',
  'INVOICE_BEFORE_DUE_DATE',
  'INVOICE_OVERDUE_FIRST',
  'INVOICE_OVERDUE_SECOND',
];

describe('AutomaticRemindersService', () => {
  const candidate = {
    id: 'document-1',
    companyId: 'company-1',
    clientName: 'Client',
    clientEmail: 'client@example.test',
    documentNumber: '#DOC-1',
    totalPrice: 120,
    answerDueAt: new Date('2026-09-01'),
    paymentDueAt: new Date('2026-09-01'),
  };

  const createService = () => {
    const prisma = {
      processedReminders: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      processedInstalmentReminder: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      document: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const mail = {
      createReminderMail: jest.fn().mockReturnValue({
        subject: 'Relance',
        text: 'Relance',
        html: '<p>Relance</p>',
      }),
      sendMail: jest.fn().mockResolvedValue(undefined),
    };
    const planAccess = {
      getCompanyAccess: jest.fn().mockResolvedValue({
        features: { automaticReminders: true },
      }),
    };
    const negotiation = {
      createNegotiationUrl: jest
        .fn()
        .mockResolvedValue(
          'https://onetto.test/negociations?token=fresh-token',
        ),
    };

    return {
      service: new AutomaticRemindersService(
        prisma as never,
        mail as never,
        planAccess as never,
        negotiation as never,
      ),
      prisma,
      mail,
      negotiation,
    };
  };

  it.each(reminderTypes)('envoie et trace la relance %s', async (type) => {
    const { service, prisma, mail, negotiation } = createService();

    await service.sendReminders(type, [candidate]);

    expect(mail.createReminderMail).toHaveBeenCalledWith(
      expect.objectContaining({ documentNumber: '#DOC-1' }),
      type,
    );
    expect(mail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'client@example.test' }),
    );
    expect(prisma.processedReminders.create).toHaveBeenCalledWith({
      data: { documentId: 'document-1', reminderType: type },
    });
    if (type.startsWith('ESTIMATE')) {
      expect(negotiation.createNegotiationUrl).toHaveBeenCalledWith(candidate);
      expect(mail.createReminderMail).toHaveBeenCalledWith(
        expect.objectContaining({
          action: {
            label: 'Consulter le devis',
            url: 'https://onetto.test/negociations?token=fresh-token',
          },
        }),
        type,
      );
    } else {
      expect(negotiation.createNegotiationUrl).not.toHaveBeenCalled();
    }
  });

  it("ne trace pas une relance lorsque l'envoi échoue", async () => {
    const { service, prisma, mail } = createService();
    mail.sendMail.mockRejectedValueOnce(new Error('SMTP indisponible'));

    await service.sendReminders('INVOICE_OVERDUE_FIRST', [candidate]);

    expect(prisma.processedReminders.create).not.toHaveBeenCalled();
  });

  it('envoie une relance distincte pour une échéance impayée', async () => {
    const { service, prisma, mail } = createService();

    await (service as any).processOverdueInstalmentReminders([
      {
        id: 'instalment-1',
        instalmentNumber: 2,
        amountInCents: 5000,
        dueDate: new Date('2026-09-01'),
        invoiceInstalmentPlan: { invoice: candidate },
      },
    ]);

    expect(mail.createReminderMail).toHaveBeenCalledWith(
      expect.objectContaining({ instalmentNumber: 2, instalmentAmount: 50 }),
      'INSTALMENT_PAYMENT_OVERDUE',
    );
    expect(prisma.processedInstalmentReminder.create).toHaveBeenCalledWith({
      data: {
        instalmentId: 'instalment-1',
        reminderType: 'INSTALMENT_PAYMENT_OVERDUE',
      },
    });
  });
});
