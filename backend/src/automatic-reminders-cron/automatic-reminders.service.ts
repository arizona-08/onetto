import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Document, Prisma, ReminderType } from '@prisma/client';
import { MailService } from 'src/mail/mail.service';
import { PlanAccessService } from 'src/plan-access/plan-access.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { REMINDER_RULES } from 'src/types/extended-request.types';
import { EstimateReminderNegotiationService } from './estimate-reminder-negotiation.service';

type ReminderCandidate = Pick<
  Document,
  | 'id'
  | 'companyId'
  | 'clientName'
  | 'clientEmail'
  | 'documentNumber'
  | 'totalPrice'
  | 'answerDueAt'
  | 'paymentDueAt'
>;

type MandateReminderCandidate = ReminderCandidate & {
  invoiceInstalmentPlan: { authorizationDeadline: Date };
};

type InstalmentReminderCandidate = {
  id: string;
  instalmentNumber: number;
  amountInCents: number;
  dueDate: Date;
  invoiceInstalmentPlan: {
    invoice: ReminderCandidate;
  };
};

@Injectable()
export class AutomaticRemindersService {
  private readonly logger = new Logger(AutomaticRemindersService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    private readonly planAccessService: PlanAccessService,
    private readonly estimateReminderNegotiationService: EstimateReminderNegotiationService,
  ) {}

  async processReminders(): Promise<void> {
    const reminders: Array<[ReminderType, Promise<ReminderCandidate[]>]> = [
      ['ESTIMATE_PENDING', this.getEstimatePendingToRemind()],
      [
        'ESTIMATE_PENDING_BEFORE_DUE_DATE',
        this.getPendingEstimatesBeforeDueDateToRemind(),
      ],
      ['INVOICE_BEFORE_DUE_DATE', this.getInvoiceBeforeDueDateToRemind()],
      ['INVOICE_OVERDUE_FIRST', this.getInvoiceOverdueFirstToRemind()],
      ['INVOICE_OVERDUE_SECOND', this.getInvoiceOverdueSecondToRemind()],
    ];

    const [
      candidates,
      mandateAfterIssue,
      mandateBeforeDeadline,
      overdueInstalments,
    ] = await Promise.all([
      Promise.all(
        reminders.map(
          async ([type, documents]) => [type, await documents] as const,
        ),
      ),
      this.getInstalmentMandateAfterIssueToRemind(),
      this.getInstalmentMandateBeforeDeadlineToRemind(),
      this.getOverdueInstalmentsToRemind(),
    ]);

    for (const [type, documents] of candidates) {
      await this.sendReminders(type, documents);
    }
    await this.processMandateReminderDocuments(
      'INSTALMENT_MANDATE_AFTER_ISSUE',
      mandateAfterIssue,
    );
    await this.processMandateReminderDocuments(
      'INSTALMENT_MANDATE_BEFORE_AUTHORIZATION_DEADLINE',
      mandateBeforeDeadline,
    );
    await this.processOverdueInstalmentReminders(overdueInstalments);
  }

  async sendReminders(
    type: ReminderType,
    documents: ReminderCandidate[],
  ): Promise<void> {
    switch (type) {
      case 'ESTIMATE_PENDING':
        return this.handleEstimatePendingReminders(documents);
      case 'ESTIMATE_PENDING_BEFORE_DUE_DATE':
        return this.handleEstimatePendingBeforeDueDateReminders(documents);
      case 'INVOICE_BEFORE_DUE_DATE':
        return this.handleInvoiceBeforeDueDateReminders(documents);
      case 'INVOICE_OVERDUE_FIRST':
        return this.handleInvoiceOverdueFirstReminders(documents);
      case 'INVOICE_OVERDUE_SECOND':
        return this.handleInvoiceOverdueSecondReminders(documents);
    }
  }

  async handleEstimatePendingReminders(
    documents: ReminderCandidate[],
  ): Promise<void> {
    await this.processReminderDocuments(
      'ESTIMATE_PENDING',
      documents,
      'answerDueAt',
    );
  }

  async handleEstimatePendingBeforeDueDateReminders(
    documents: ReminderCandidate[],
  ): Promise<void> {
    await this.processReminderDocuments(
      'ESTIMATE_PENDING_BEFORE_DUE_DATE',
      documents,
      'answerDueAt',
    );
  }

  async handleInvoiceBeforeDueDateReminders(
    documents: ReminderCandidate[],
  ): Promise<void> {
    await this.processReminderDocuments(
      'INVOICE_BEFORE_DUE_DATE',
      documents,
      'paymentDueAt',
    );
  }

  async handleInvoiceOverdueFirstReminders(
    documents: ReminderCandidate[],
  ): Promise<void> {
    await this.processReminderDocuments(
      'INVOICE_OVERDUE_FIRST',
      documents,
      'paymentDueAt',
    );
  }

  async handleInvoiceOverdueSecondReminders(
    documents: ReminderCandidate[],
  ): Promise<void> {
    await this.processReminderDocuments(
      'INVOICE_OVERDUE_SECOND',
      documents,
      'paymentDueAt',
    );
  }

  private async processReminderDocuments(
    type: ReminderType,
    documents: ReminderCandidate[],
    dueDateField: 'answerDueAt' | 'paymentDueAt',
  ): Promise<void> {
    for (const document of documents) {
      try {
        if (!(await this.isAutomaticReminderEnabled(document.companyId)))
          continue;
        if (await this.verifyIfReminderAlreadySent(document.id, type)) continue;

        this.logger.log(
          `Envoi de la relance ${type} pour le document ${document.id} à ${document.clientEmail}...`,
        );
        const negotiationUrl = this.isEstimateReminder(type)
          ? await this.estimateReminderNegotiationService.createNegotiationUrl(
              document,
            )
          : undefined;
        const reminderMail = this.mailService.createReminderMail(
          {
            clientName: document.clientName,
            documentNumber: document.documentNumber,
            dueAt: document[dueDateField],
            action: negotiationUrl
              ? { label: 'Consulter le devis', url: negotiationUrl }
              : undefined,
          },
          type,
        );

        await this.mailService.sendMail({
          to: document.clientEmail,
          ...reminderMail,
        });
        await this.markReminderAsSent(document.id, type);
      } catch (error) {
        this.logger.error(
          `Impossible d'envoyer la relance ${type} pour le document ${document.id}.`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private async processMandateReminderDocuments(
    type:
      | 'INSTALMENT_MANDATE_AFTER_ISSUE'
      | 'INSTALMENT_MANDATE_BEFORE_AUTHORIZATION_DEADLINE',
    documents: MandateReminderCandidate[],
  ): Promise<void> {
    for (const document of documents) {
      try {
        if (!(await this.isAutomaticReminderEnabled(document.companyId)))
          continue;
        if (await this.verifyIfReminderAlreadySent(document.id, type)) continue;

        const reminderMail = this.mailService.createReminderMail(
          {
            clientName: document.clientName,
            documentNumber: document.documentNumber,
            dueAt: document.invoiceInstalmentPlan.authorizationDeadline,
          },
          type,
        );
        await this.mailService.sendMail({
          to: document.clientEmail,
          ...reminderMail,
        });
        await this.markReminderAsSent(document.id, type);
      } catch (error) {
        this.logger.error(
          `Impossible d'envoyer la relance ${type} pour le document ${document.id}.`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private async processOverdueInstalmentReminders(
    instalments: InstalmentReminderCandidate[],
  ): Promise<void> {
    for (const instalment of instalments) {
      try {
        const document = instalment.invoiceInstalmentPlan.invoice;
        if (!(await this.isAutomaticReminderEnabled(document.companyId)))
          continue;
        if (
          await this.verifyIfInstalmentReminderAlreadySent(
            instalment.id,
            'INSTALMENT_PAYMENT_OVERDUE',
          )
        ) {
          continue;
        }

        const reminderMail = this.mailService.createReminderMail(
          {
            clientName: document.clientName,
            documentNumber: document.documentNumber,
            dueAt: instalment.dueDate,
            instalmentNumber: instalment.instalmentNumber,
            instalmentAmount: instalment.amountInCents / 100,
          },
          'INSTALMENT_PAYMENT_OVERDUE',
        );
        await this.mailService.sendMail({
          to: document.clientEmail,
          ...reminderMail,
        });
        await this.markInstalmentReminderAsSent(
          instalment.id,
          'INSTALMENT_PAYMENT_OVERDUE',
        );
      } catch (error) {
        this.logger.error(
          `Impossible d'envoyer la relance de l'échéance ${instalment.id}.`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private async isAutomaticReminderEnabled(
    companyId: string,
  ): Promise<boolean> {
    const access = await this.planAccessService.getCompanyAccess(companyId);
    return access.features.automaticReminders;
  }

  async markReminderAsSent(
    documentId: string,
    reminderType: ReminderType,
  ): Promise<void> {
    try {
      await this.prismaService.processedReminders.create({
        data: { documentId, reminderType },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        "Erreur lors de l'enregistrement de la relance envoyée",
        { cause: error as Error },
      );
    }
  }

  async verifyIfReminderAlreadySent(
    documentId: string,
    reminderType: ReminderType,
  ): Promise<boolean> {
    try {
      const reminder = await this.prismaService.processedReminders.findUnique({
        where: { documentId_reminderType: { documentId, reminderType } },
      });
      return !!reminder;
    } catch (error) {
      throw new InternalServerErrorException(
        'Erreur lors de la vérification des relances déjà envoyées',
        { cause: error as Error },
      );
    }
  }

  private async markInstalmentReminderAsSent(
    instalmentId: string,
    reminderType: ReminderType,
  ): Promise<void> {
    await this.prismaService.processedInstalmentReminder.create({
      data: { instalmentId, reminderType },
    });
  }

  private async verifyIfInstalmentReminderAlreadySent(
    instalmentId: string,
    reminderType: ReminderType,
  ): Promise<boolean> {
    const reminder =
      await this.prismaService.processedInstalmentReminder.findUnique({
        where: { instalmentId_reminderType: { instalmentId, reminderType } },
      });
    return !!reminder;
  }

  async getEstimatePendingToRemind(): Promise<ReminderCandidate[]> {
    return this.findReminderCandidates({
      type: 'ESTIMATE',
      estimateStatus: 'SENT',
      sentAt: { lte: this.daysAgo(REMINDER_RULES.ESTIMATE_PENDING) },
    });
  }

  async getPendingEstimatesBeforeDueDateToRemind(): Promise<
    ReminderCandidate[]
  > {
    return this.findReminderCandidates({
      type: 'ESTIMATE',
      estimateStatus: 'SENT',
      sentAt: { lte: new Date() },
      answerDueAt: {
        gte: new Date(),
        lte: this.daysFromNow(REMINDER_RULES.ESTIMATE_PENDING_BEFORE_DUE_DATE),
      },
    });
  }

  async getInvoiceBeforeDueDateToRemind(): Promise<ReminderCandidate[]> {
    return this.findReminderCandidates({
      type: 'INVOICE',
      invoiceStatus: 'PENDING',
      sentAt: { lte: new Date() },
      paymentDueAt: {
        gte: new Date(),
        lte: this.daysFromNow(REMINDER_RULES.INVOICE_BEFORE_DUE_DATE),
      },
      NOT: { invoicePaymentMode: { is: { paymentMode: 'INSTALMENTS' } } },
    });
  }

  async getInvoiceOverdueFirstToRemind(): Promise<ReminderCandidate[]> {
    return this.findReminderCandidates({
      type: 'INVOICE',
      invoiceStatus: 'PENDING',
      paymentDueAt: { lte: this.daysAgo(REMINDER_RULES.INVOICE_OVERDUE_FIRST) },
      NOT: { invoicePaymentMode: { is: { paymentMode: 'INSTALMENTS' } } },
    });
  }

  async getInvoiceOverdueSecondToRemind(): Promise<ReminderCandidate[]> {
    return this.findReminderCandidates({
      type: 'INVOICE',
      invoiceStatus: 'PENDING',
      paymentDueAt: {
        lte: this.daysAgo(REMINDER_RULES.INVOICE_OVERDUE_SECOND),
      },
      NOT: { invoicePaymentMode: { is: { paymentMode: 'INSTALMENTS' } } },
    });
  }

  private async getInstalmentMandateAfterIssueToRemind(): Promise<
    MandateReminderCandidate[]
  > {
    return this.findMandateReminderCandidates(
      {},
      {
        sentAt: {
          lte: this.daysAgo(REMINDER_RULES.INSTALMENT_MANDATE_AFTER_ISSUE),
        },
      },
    );
  }

  private async getInstalmentMandateBeforeDeadlineToRemind(): Promise<
    MandateReminderCandidate[]
  > {
    return this.findMandateReminderCandidates({
      authorizationDeadline: {
        gte: new Date(),
        lte: this.daysFromNow(
          REMINDER_RULES.INSTALMENT_MANDATE_BEFORE_AUTHORIZATION_DEADLINE,
        ),
      },
    });
  }

  private async findMandateReminderCandidates(
    planWhere: Prisma.InvoiceInstalmentPlanWhereInput,
    documentWhere: Prisma.DocumentWhereInput = {},
  ): Promise<MandateReminderCandidate[]> {
    return this.prismaService.document.findMany({
      where: {
        type: 'INVOICE',
        invoiceStatus: { in: ['PENDING', 'PAYMENT_IN_PROGRESS'] },
        isLastVersion: true,
        ...documentWhere,
        invoicePaymentMode: { is: { paymentMode: 'INSTALMENTS' } },
        invoiceInstalmentPlan: {
          is: {
            ...planWhere,
            providerMandateId: null,
            providerScheduledId: null,
          },
        },
      },
      select: {
        id: true,
        companyId: true,
        clientName: true,
        clientEmail: true,
        documentNumber: true,
        totalPrice: true,
        answerDueAt: true,
        paymentDueAt: true,
        invoiceInstalmentPlan: { select: { authorizationDeadline: true } },
      },
    }) as Promise<MandateReminderCandidate[]>;
  }

  private async getOverdueInstalmentsToRemind(): Promise<
    InstalmentReminderCandidate[]
  > {
    return this.prismaService.invoicePaymentInstalment.findMany({
      where: {
        dueDate: { lt: new Date() },
        instalmentStatus: { in: ['PENDING', 'PAYMENT_IN_PROGRESS', 'OVERDUE'] },
        invoiceInstalmentPlan: {
          providerScheduledId: { not: null },
          invoice: {
            type: 'INVOICE',
            isLastVersion: true,
            invoiceStatus: {
              in: ['PENDING', 'PAYMENT_IN_PROGRESS', 'PARTIALLY_PAID'],
            },
            invoicePaymentMode: { is: { paymentMode: 'INSTALMENTS' } },
          },
        },
      },
      select: {
        id: true,
        instalmentNumber: true,
        amountInCents: true,
        dueDate: true,
        invoiceInstalmentPlan: {
          select: {
            invoice: {
              select: {
                id: true,
                companyId: true,
                clientName: true,
                clientEmail: true,
                documentNumber: true,
                totalPrice: true,
                answerDueAt: true,
                paymentDueAt: true,
              },
            },
          },
        },
      },
    });
  }

  private async findReminderCandidates(
    where: Prisma.DocumentWhereInput,
  ): Promise<ReminderCandidate[]> {
    try {
      return await this.prismaService.document.findMany({
        where: { ...where, isLastVersion: true },
        select: {
          id: true,
          companyId: true,
          clientName: true,
          clientEmail: true,
          documentNumber: true,
          totalPrice: true,
          answerDueAt: true,
          paymentDueAt: true,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erreur lors de la récupération des documents à relancer',
        { cause: error as Error },
      );
    }
  }

  private daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  private daysFromNow(days: number): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private isEstimateReminder(type: ReminderType): boolean {
    return (
      type === 'ESTIMATE_PENDING' || type === 'ESTIMATE_PENDING_BEFORE_DUE_DATE'
    );
  }
}
