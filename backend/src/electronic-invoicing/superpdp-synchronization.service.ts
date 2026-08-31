import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SuperPdpB2bService } from './superpdp-b2b.service';
import { SuperPdpIncomingInvoicesService } from './superpdp-incoming-invoices.service';

/**
 * SuperPDP exposes invoice events through a paginated pull API. Until a
 * webhook contract is available, polling is the reliable way to keep the
 * outgoing B2B lifecycle current without asking users to refresh manually.
 */
@Injectable()
export class SuperPdpSynchronizationService {
  private readonly logger = new Logger(SuperPdpSynchronizationService.name);
  private isRunning = false;

  constructor(private readonly b2b: SuperPdpB2bService, private readonly incoming: SuperPdpIncomingInvoicesService) {}

  @Cron('0 */15 * * * *', { timeZone: 'Europe/Paris' })
  async synchronizeOutgoingInvoices() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const result = await this.b2b.syncPendingTransmissions();
      const incoming = await this.incoming.synchronizeAll();
      if (result.checked > 0) {
        this.logger.log(`Synchronisation SuperPDP : ${result.synchronized}/${result.checked} facture(s) mise(s) à jour.`);
      }
      if (result.failed > 0) {
        this.logger.warn(`Synchronisation SuperPDP incomplète : ${result.failed} facture(s) à réessayer.`);
      }
      if (incoming.failed > 0) this.logger.warn(`Synchronisation des factures fournisseurs incomplète : ${incoming.failed} entreprise(s) à réessayer.`);
    } catch (error) {
      this.logger.error('La synchronisation SuperPDP a échoué.', error instanceof Error ? error.stack : undefined);
    } finally {
      this.isRunning = false;
    }
  }
}
