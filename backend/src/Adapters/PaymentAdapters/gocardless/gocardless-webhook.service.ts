import { Injectable, Logger } from '@nestjs/common';
import { GoCardlessInstalmentSchedulesWebhookHandler } from './webhook-handlers/gocardless-instalment-schedules-webhook.handler';
import { GoCardlessMandateWebhookHandler } from './webhook-handlers/gocardless-mandate-webhook.handler';
import { GoCardlessPaymentWebhookHandler } from './webhook-handlers/gocardless-payment-webhook.handler';
import { GoCardlessWebhookDto } from './webhook-handlers/dtos/event.dto';
import { GoCardlessBillingRequestWebhookHandler } from './webhook-handlers/gocardless-billing-request-webhook.handler';
import { PrismaService } from 'src/prisma/prisma.service';
import { $Enums } from '@prisma/client';

@Injectable()
export class GoCardlessWebhookService {
  private readonly logger = new Logger(GoCardlessWebhookService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly billingRequestHandler: GoCardlessBillingRequestWebhookHandler,
    private readonly instalmentSchedulesHandler: GoCardlessInstalmentSchedulesWebhookHandler,
    private readonly mandateHandler: GoCardlessMandateWebhookHandler,
    private readonly paymentHandler: GoCardlessPaymentWebhookHandler,
    private readonly subscriptionHandler: GoCardlessPaymentWebhookHandler,
  ) {}

  async redirectWebhookToHandler(webhook: GoCardlessWebhookDto): Promise<void> {
    console.log(
      'Redirecting GoCardless webhook to the appropriate handler:',
      webhook,
    );
    // Implement the logic to redirect the webhook to the correct handler based on the event type

    const events = webhook.events;
    for (const event of events) {
      try {
        const claimed = await this.claimEvent(event.id);
        if (!claimed) {
          console.log(
            `Webhook event with ID ${event.id} has already been processed. Skipping.`,
          );
          continue;
        }
  
        try {
          switch (event.resource_type) {
            case 'billing_request':
            case 'billing_requests':
              await this.billingRequestHandler.handleWebhook(event);
              break;
            case 'mandates':
              await this.mandateHandler.handleWebhook(event);
              break;
            case 'payments':
              await this.paymentHandler.handleWebhook(event);
              break;
            case 'instalment_schedules':
              await this.instalmentSchedulesHandler.handleWebhook(event);
              break;
          }
        } catch (error) {
          await this.prismaService.processedWebhookEvents.delete({
            where: {
              provider_providerEventId: {
                provider: $Enums.PaymentProvider.GOCARDLESS,
                providerEventId: event.id,
              },
            },
          });
          throw error;
        }
      } catch (error) {
        this.logger.error(
          `Erreur lors du traitement de l'événement GoCardless ${event.id}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
  }

  async isAlreadyProcessed(
    provider: $Enums.PaymentProvider,
    eventId: string,
  ): Promise<boolean> {
    const existingEvent =
      await this.prismaService.processedWebhookEvents.findUnique({
        where: {
          provider_providerEventId: {
            provider: provider,
            providerEventId: eventId,
          },
        },
      });
    return !!existingEvent;
  }

  private async claimEvent(eventId: string): Promise<boolean> {
    try {
      await this.prismaService.processedWebhookEvents.create({
        data: {
          provider: $Enums.PaymentProvider.GOCARDLESS,
          providerEventId: eventId,
        },
      });
      return true;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        return false;
      }
      throw error;
    }
  }
}
