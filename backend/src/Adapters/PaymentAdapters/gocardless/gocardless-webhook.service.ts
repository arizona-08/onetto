import { Injectable, Logger } from '@nestjs/common';
import { GoCardlessInstalmentSchedulesWebhookHandler } from './webhook-handlers/gocardless-instalment-schedules-webhook.handler';
import { GoCardlessMandateWebhookHandler } from './webhook-handlers/gocardless-mandate-webhook.handler';
import { GoCardlessPaymentWebhookHandler } from './webhook-handlers/gocardless-payment-webhook.handler';
import { GoCardlessWebhookDto } from './webhook-handlers/dtos/event.dto';
import { GoCardlessBillingRequestWebhookHandler } from './webhook-handlers/gocardless-billing-request-webhook.handler';
import { PrismaService } from 'src/prisma/prisma.service';
import { $Enums } from '@prisma/client';
import { GoCardlessOAuthService } from './gocardless-oauth.service';
import { ServiceUnavailableException } from '@nestjs/common';

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
    private readonly gocardlessOAuthService: GoCardlessOAuthService,
  ) {}

  async redirectWebhookToHandler(webhook: GoCardlessWebhookDto): Promise<void> {
    console.log(
      'Redirecting GoCardless webhook to the appropriate handler:',
      webhook,
    );
    // Implement the logic to redirect the webhook to the correct handler based on the event type

    const events = webhook.events;
    let failed = false;
    for (const event of events) {
      try {
        const claim = await this.claimEvent(event.id);
        if (claim.state === 'completed') {
          continue;
        }
        if (claim.state === 'pending') {
          failed = true;
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
          const completed =
            await this.prismaService.processedWebhookEvents.updateMany({
              where: {
                provider: $Enums.PaymentProvider.GOCARDLESS,
                providerEventId: event.id,
                claimedAt: claim.claimedAt,
                completedAt: null,
              },
              data: { completedAt: new Date() },
            });
          if (completed.count !== 1) {
            throw new Error(`Webhook ${event.id}: réservation expirée.`);
          }
        } catch (error) {
          await this.prismaService.processedWebhookEvents.deleteMany({
            where: {
              provider: $Enums.PaymentProvider.GOCARDLESS,
              providerEventId: event.id,
              claimedAt: claim.claimedAt,
              completedAt: null,
            },
          });
          throw error;
        }
      } catch (error) {
        failed = true;
        const tokenWasRevoked = await Promise.resolve(
          this.gocardlessOAuthService.markProviderAccountDisconnectedIfTokenInactive(
            event.organisation_id,
            error,
          ),
        ).catch(() => false);
        if (tokenWasRevoked) {
          this.logger.warn(
            `Connexion GoCardless désactivée après le webhook ${event.id}: jeton inactif ou révoqué.`,
          );
        }
        this.logger.error(
          `Erreur lors du traitement de l'événement GoCardless ${event.id}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
    if (failed) {
      throw new ServiceUnavailableException(
        'Certains événements GoCardless n’ont pas pu être traités.',
      );
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
    return !!existingEvent?.completedAt;
  }

  private async claimEvent(
    eventId: string,
  ): Promise<
    | { state: 'claimed'; claimedAt: Date }
    | { state: 'completed' }
    | { state: 'pending' }
  > {
    const claimedAt = new Date();
    try {
      await this.prismaService.processedWebhookEvents.create({
        data: {
          provider: $Enums.PaymentProvider.GOCARDLESS,
          providerEventId: eventId,
          claimedAt,
        },
      });
      return { state: 'claimed', claimedAt };
    } catch (error) {
      const prismaError = error as { code?: unknown } | null;
      if (prismaError?.code === 'P2002') {
        const current =
          await this.prismaService.processedWebhookEvents.findUnique({
            where: {
              provider_providerEventId: {
                provider: $Enums.PaymentProvider.GOCARDLESS,
                providerEventId: eventId,
              },
            },
            select: { completedAt: true, claimedAt: true },
          });
        if (current?.completedAt) return { state: 'completed' };
        if (
          !current ||
          current.claimedAt > new Date(Date.now() - 15 * 60_000)
        ) {
          return { state: 'pending' };
        }
        const recovered =
          await this.prismaService.processedWebhookEvents.updateMany({
            where: {
              provider: $Enums.PaymentProvider.GOCARDLESS,
              providerEventId: eventId,
              claimedAt: current.claimedAt,
              completedAt: null,
            },
            data: { claimedAt },
          });
        return recovered.count === 1
          ? { state: 'claimed', claimedAt }
          : { state: 'pending' };
      }
      throw error;
    }
  }
}
