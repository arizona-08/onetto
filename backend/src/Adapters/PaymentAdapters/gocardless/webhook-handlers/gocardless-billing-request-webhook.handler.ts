import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { WebhookHandlerInterface } from '../../Interfaces/WebhookHandler.interface';
import { GoCardlessEventDto } from './dtos/event.dto';
import { GoCardlessStatusMatcherService } from '../gocardless-status-matcher.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GoCardlessOAuthService } from '../gocardless-oauth.service';
import { $Enums } from '@prisma/client';
import { GoCardlessClient } from 'gocardless-nodejs';

@Injectable()
export class GoCardlessBillingRequestWebhookHandler implements WebhookHandlerInterface {
  constructor(
    private readonly gocardlessOAuthService: GoCardlessOAuthService,
    private readonly gocardlessStatusMatcherService: GoCardlessStatusMatcherService,
    private readonly prismaService: PrismaService,
  ) {}

  async handleWebhook(webhook: GoCardlessEventDto): Promise<void> {
    if (!this.isRelevantAction(webhook.action)) {
      return;
    }

    const billingRequestId = webhook.links.billing_request;
    if (!billingRequestId) {
      throw new Error(
        `Billing request missing from webhook event ${webhook.id}`,
      );
    }

    if (webhook.action === 'bank_authorisation_failed' || webhook.action === 'bank_authorisation_denied') {
      await this.markPaymentAsFailed(billingRequestId, webhook);
      return;
    }

    const client = await this.gocardlessOAuthService.getClientForProviderAccount(webhook.organisation_id);
    const billingRequest = await client.billingRequests.find(billingRequestId);
    if (!billingRequest) {
      throw new Error(
        `Billing request with ID ${billingRequestId} not found for provider account ${webhook.organisation_id}`,
      );
    }

    const existingInstalmentPlan = await this.prismaService.invoiceInstalmentPlan.findUnique({
      where: {
        providerReference: billingRequestId,
      },
      include: {
        invoice: {
          select: {
            id: true,
            documentNumber: true,
            invoicePaymentMode: {
              select: {
                paymentModeFrequency: true
              }
            }
          }
        },
        invoicePaymentInstalments: {
          orderBy: { instalmentNumber: 'asc' },
          select: { amountInCents: true },
        },
      }
    });

    if(existingInstalmentPlan){
      if(billingRequest.status === 'fulfilled'){
        if (existingInstalmentPlan.providerScheduledId) {
          return;
        }
        await this.createInstalmentSchedule({
          name: `Instalment plan for invoice ${existingInstalmentPlan.invoice.documentNumber}`,
          totalAmountInCents: existingInstalmentPlan.totalAmountInCents,
          startDate: existingInstalmentPlan.startDate.toISOString().slice(0, 10),
          intervalUnit: existingInstalmentPlan.invoice.invoicePaymentMode?.paymentModeFrequency as $Enums.PaymentModeFrequency,
          interval: 1,
          amountsInCents: existingInstalmentPlan.invoicePaymentInstalments.map(
            (instalment) => instalment.amountInCents,
          ),
          mandateId: billingRequest.links?.mandate_request_mandate as string
        }, billingRequestId, client);
      }
      return;
    }

    const mappedStatus = this.gocardlessStatusMatcherService.matchLinkStatus(billingRequest.status as string,);

    await this.syncLinkStatus(billingRequestId, mappedStatus);
  }

  isRelevantAction(action: string): boolean {
    const relevantActions = [
      'bank_authorisation_denied',
      'bank_authorisation_failed',
      'fulfilled',
    ];
    return relevantActions.includes(action);
  }

  async createInstalmentSchedule(input: {
    name: string;
    totalAmountInCents: number;
    startDate: string;
    intervalUnit: $Enums.PaymentModeFrequency;
    interval: number;
    amountsInCents: number[];
    mandateId: string;
  } ,
    billingRequestId: string,
    client: GoCardlessClient){
    try{
      if (
        input.amountsInCents.length === 0 ||
        input.amountsInCents.some((amount) => !Number.isSafeInteger(amount) || amount <= 0) ||
        input.amountsInCents.reduce((total, amount) => total + amount, 0) !== input.totalAmountInCents
      ) {
        throw new InternalServerErrorException(
          "L'échéancier Onetto contient des montants invalides pour GoCardless.",
        );
      }
      const payload = {
        name: input.name,
        currency: "EUR" as "EUR",
        total_amount: input.totalAmountInCents.toString(),
        instalments: {
          start_date: input.startDate,
          interval_unit: input.intervalUnit.toLocaleLowerCase() as "weekly" | "monthly" | "yearly",
          interval: input.interval,
          amounts: input.amountsInCents.map(String),
        },
        links: {
          mandate: input.mandateId
        }
      }

      const createdSchedule = await client.instalmentSchedules.createWithSchedule(payload);
      if(!createdSchedule){
        throw new InternalServerErrorException("Failed to create instalment schedule with GoCardless");
      }

      // GoCardless can return a newly-created schedule before its Payments have
      // been generated. The canonical payment IDs live on the fetched schedule.
      const instalmentSchedule = await client.instalmentSchedules.find(
        createdSchedule.id as string,
      );
      await this.updateCreatedInstalmentPlan(
        billingRequestId,
        createdSchedule.id as string,
        input.mandateId,
        instalmentSchedule?.links?.payments,
      )
    } catch (error) {
      console.error("Erreur lors de la création du instalment schedule", error);
      throw error;
    }
  }

  async updateCreatedInstalmentPlan(billingRequestId: string, providerScheduledId: string, providerMandateId: string, payments?: string[]){
    try{
      const existingInstalmentPlan = await this.prismaService.invoiceInstalmentPlan.findUnique({
        where: {
          providerReference: billingRequestId,
        },
        select: {
          id: true,
          providerReference: true,
        }
      });

      if(!existingInstalmentPlan){
        throw new Error(`No instalment plan found for billing request ID ${billingRequestId}`);
      }

      const updateInstalmentPlan =await this.prismaService.invoiceInstalmentPlan.update({
        where: {
          id: existingInstalmentPlan.id,
        },
        data: {
          providerScheduledId,
          providerMandateId
        }
      });

      if (!payments?.length) {
        console.log(
          `Instalment schedule ${providerScheduledId} créé, en attente des Payments GoCardless.`,
        );
        return;
      }

      await this.prismaService.$transaction(async (prisma) => {
        for(let i = 0; i < payments.length; i++){
          const paymentNumber = i + 1;

          await prisma.invoicePaymentInstalment.update({
            where: {
              invoiceInstalmentPlanId_instalmentNumber: {
                invoiceInstalmentPlanId: updateInstalmentPlan.id,
                instalmentNumber: paymentNumber
              }
            },
            data: {
              providerPaymentId: payments[i]
            }
          })
        }
      })

    } catch (error) {
      console.error("Erreur lors de la mise à jour du instalment plan", error);
      throw error;
    }
  }

  async syncPayByBankPaymentStatus(
    providerReference: string,
    providerStatus: $Enums.InvoicePaymentStatus
  ){

  }

  async syncLinkStatus(
    billingRequestId: string,
    billingRequestStatus: $Enums.InvoicePaymentLinkStatus,
  ): Promise<void> {
    const invoicePaymentLink =
      await this.prismaService.invoicePaymentLink.findUnique({
        where: {
          providerReference: billingRequestId,
        },
      });

    if (!invoicePaymentLink) {
      throw new Error(
        `No invoice payment link found for billing request ID ${billingRequestId}`,
      );
    }

    await this.prismaService.processedWebhookEvents.create({
      data: {
        provider: 'GOCARDLESS',
        providerEventId: billingRequestId,
      },
    });

    const existingStatus = invoicePaymentLink.linkStatus;

    if (existingStatus === billingRequestStatus) {
      console.log(
        `No status change for billing request ID ${billingRequestId}. Existing status: ${existingStatus}, New status: ${billingRequestStatus}`,
      );
      return;
    }

    const canBeUpdated =
      existingStatus !== 'COMPLETED' &&
      existingStatus !== 'EXPIRED' &&
      existingStatus !== 'REVOKED' &&
      existingStatus !== 'FAILED';

    if (!canBeUpdated) {
      console.log(
        `Cannot update billing request ID ${billingRequestId} from status ${existingStatus} to ${billingRequestStatus}`,
      );
      return;
    }

    await this.prismaService.invoicePaymentLink.update({
      where: {
        id: invoicePaymentLink.id,
      },
      data: {
        linkStatus: billingRequestStatus,
      },
    });
  }

  /**
   * Une autorisation bancaire refusée rend le lien inutilisable. La tentative la
   * plus récente est celle associée au parcours de paiement qui vient d'échouer.
   */
  private async markPaymentAsFailed(
    billingRequestId: string,
    webhook: GoCardlessEventDto,
  ): Promise<void> {
    const payByBankPayment =
      await this.prismaService.payByBankPayment.findUnique({
        where: { providerReference: billingRequestId },
        include: {
          payByBankPaymentAttempts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true },
          },
        },
      });

    if (!payByBankPayment) {
      throw new Error(
        `No payment found for billing request ID ${billingRequestId}`,
      );
    }

    const failureReason =
      typeof webhook.details.description === 'string'
        ? webhook.details.description
        : 'Bank authorisation failed';

    await this.prismaService.$transaction(async (prisma) => {
      await prisma.payByBankPayment.update({
        where: { id: payByBankPayment.id },
        data: {
          status: 'FAILED',
        },
      });

      const latestAttempt = payByBankPayment.payByBankPaymentAttempts[0];
      if (latestAttempt) {
        await prisma.payByBankPaymentAttempt.update({
          where: { id: latestAttempt.id },
          data: {
            paymentStatus: 'FAILED',
            failureReason,
          },
        });
      }
    });
  }
}
