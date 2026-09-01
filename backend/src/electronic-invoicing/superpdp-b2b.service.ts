import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { Prisma, ElectronicInvoiceTransmissionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { FacturXService } from './factur-x.service';
import { SuperPdpOAuthService } from './superpdp-oauth.service';
import type { User } from 'src/types/extended-request.types';

type ProviderEvent = {
  id?: number | string;
  invoice_id?: number | string;
  status_code?: string;
  status_text?: string;
  created_at?: string;
  [key: string]: unknown;
};

@Injectable()
export class SuperPdpB2bService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth: SuperPdpOAuthService,
    private readonly facturX: FacturXService,
  ) {}

  async send(input: { companyId: string; documentId: string; user: User }) {
    const document = await this.findDocument(input);
    if (!document.sentAt) {
      throw new BadRequestException('La facture doit d’abord être finalisée et envoyée au client.');
    }
    if (document.clientType !== 'BUSINESS') {
      throw new BadRequestException('Seules les factures destinées à une entreprise peuvent être transmises en B2B.');
    }
    const existing = await this.prisma.electronicInvoiceTransmission.findUnique({
      where: { documentId_provider_flow: { documentId: document.id, provider: 'SUPER_PDP', flow: 'B2B_FR' } },
    });

    if (!document.clientElectronicAddress || !document.clientElectronicAddressScheme) {
      const transmission = existing ?? await this.prisma.electronicInvoiceTransmission.create({
        data: {
          documentId: document.id,
          provider: 'SUPER_PDP',
          flow: 'B2B_FR',
          idempotencyKey: randomUUID(),
        },
      });
      await this.prisma.electronicInvoiceTransmission.update({
        where: { id: transmission.id },
        data: {
          status: 'FAILED',
          lastError: 'Sélectionnez un point de réception pour ce client avant de transmettre la facture.',
        },
      });
      throw new BadRequestException('Sélectionnez une adresse électronique de réception dans l’annuaire avant la transmission.');
    }

    if (existing?.providerInvoiceId) return this.sync(input);

    const transmission = existing ?? await this.prisma.electronicInvoiceTransmission.create({
      data: {
        documentId: document.id,
        provider: 'SUPER_PDP',
        flow: 'B2B_FR',
        idempotencyKey: randomUUID(),
      },
    });

    await this.prisma.electronicInvoiceTransmission.update({
      where: { id: transmission.id },
      data: { status: 'SUBMITTING', attemptCount: { increment: 1 }, lastError: null },
    });

    try {
      const facturX = existing?.status === 'FAILED' && !existing.providerInvoiceId
        ? await this.facturX.regenerateForFailedB2BTransmission(document.id, input.user)
        : await this.facturX.archive(document.id, input.user);
      await this.validateElectronicInvoice(facturX, document.documentNumber ?? document.id, 'pdf');
      // The directory endpoint selected for Tricatel accepts Peppol BIS
      // Billing 3.0. We retain the French Factur-X as the immutable archive
      // and build the equivalent UBL transport document with Peppol's profile.
      const ubl = await this.facturX.generatePeppolUbl(document.id, input.user);
      await this.validateElectronicInvoice(ubl, document.documentNumber ?? document.id, 'xml');
      const token = await this.oauth.getAccessToken(input.companyId);
      const url = new URL('https://api.superpdp.tech/v1.beta/invoices');
      // The document UUID is a stable external id accepted by SuperPDP (max. 36 chars).
      url.searchParams.set('external_id', document.id);
      // Let SuperPDP compute the applicable rule. In sandbox, a Peppol
      // destination can legitimately be classified as B2BInt rather than B2B.
      console.log('[SuperPDP B2B] transmission request', {
        documentId: document.id,
        documentNumber: document.documentNumber,
        endpoint: url.toString(),
        format: 'ubl-peppol',
        facturXBytes: facturX.length,
        facturXFingerprint: createHash('sha256').update(facturX).digest('hex'),
        ublBytes: ubl.length,
        ublFingerprint: createHash('sha256').update(ubl).digest('hex'),
        operationNature: document.operationNature,
        buyer: {
          clientSiren: document.clientSiren,
          electronicAddress: document.clientElectronicAddress,
          electronicAddressScheme: document.clientElectronicAddressScheme,
        },
      });
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/xml' },
        body: Uint8Array.from(ubl),
      });
      if (!response.ok) {
        const details = (await response.text()).slice(0, 1000);
        throw new Error(details || `HTTP ${response.status}`);
      }
      const providerInvoice = await response.json() as { id?: number | string };
      if (providerInvoice.id === undefined) throw new Error('Réponse SuperPDP sans identifiant de facture.');

      await this.prisma.electronicInvoiceTransmission.update({
        where: { id: transmission.id },
        data: {
          providerInvoiceId: String(providerInvoice.id),
          submittedFormat: 'ubl-peppol',
          documentFingerprint: createHash('sha256').update(ubl).digest('hex'),
          status: 'SUBMITTED',
          providerStatus: 'api:uploaded',
          submittedAt: new Date(),
          lastError: null,
        },
      });
      return this.sync(input);
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'Erreur inconnue.';
      console.error('[SuperPDP B2B] Transmission failure', {
        documentId: document.id,
        companyId: input.companyId,
        error: message,
      });
      await this.prisma.electronicInvoiceTransmission.update({
        where: { id: transmission.id },
        data: { status: 'FAILED', lastError: 'La transmission n’a pas pu aboutir. Vérifiez les données de facturation avant de réessayer.' },
      });
      if (error instanceof BadRequestException) throw error;
      throw new BadGatewayException('Impossible de transmettre la facture électronique. Vérifiez les données de facturation et le point de réception du client.');
    }
  }

  async sync(input: { companyId: string; documentId: string; user: User }) {
    await this.findDocument(input);
    const transmission = await this.prisma.electronicInvoiceTransmission.findUnique({
      where: { documentId_provider_flow: { documentId: input.documentId, provider: 'SUPER_PDP', flow: 'B2B_FR' } },
    });
    if (!transmission) throw new NotFoundException('Aucune transmission B2B SuperPDP pour cette facture.');
    return this.syncTransmission(transmission, input.companyId);
  }

  /**
   * Polls only transmissions whose lifecycle can still evolve. SuperPDP
   * events are append-only, and the unique event key makes this safe to run
   * repeatedly or after a short outage.
   */
  async syncPendingTransmissions() {
    const transmissions = await this.prisma.electronicInvoiceTransmission.findMany({
      where: {
        provider: 'SUPER_PDP',
        providerInvoiceId: { not: null },
        status: { in: ['PENDING', 'SUBMITTING', 'SUBMITTED', 'SENT', 'DELIVERED', 'ON_HOLD', 'PARTIALLY_ACCEPTED', 'DISPUTED'] },
        document: { company: { electronicInvoicingConnection: { is: { status: 'ACTIVE' } } } },
      },
      include: { document: { select: { companyId: true } } },
      orderBy: { lastSyncedAt: 'asc' },
      take: 100,
    });

    const results = await Promise.allSettled(
      transmissions.map((transmission) => this.syncTransmission(transmission, transmission.document.companyId)),
    );
    return {
      checked: transmissions.length,
      synchronized: results.filter((result) => result.status === 'fulfilled').length,
      failed: results.filter((result) => result.status === 'rejected').length,
    };
  }

  private async syncTransmission(
    transmission: { id: string; providerInvoiceId: string | null; status: ElectronicInvoiceTransmissionStatus; providerStatus: string | null },
    companyId: string,
  ) {
    if (!transmission.providerInvoiceId) return transmission;

    try {
      const token = await this.oauth.getAccessToken(companyId);
      const headers = { Authorization: `Bearer ${token}` };
      const invoiceResponse = await fetch(
        `https://api.superpdp.tech/v1.beta/invoices/${encodeURIComponent(transmission.providerInvoiceId)}`,
        { headers },
      );
      if (!invoiceResponse.ok) throw new Error('SuperPDP ne permet pas encore de lire le statut de cette facture.');
      const invoice = await invoiceResponse.json() as { events?: ProviderEvent[] };
      const events = [...(invoice.events ?? []), ...await this.listAllProviderEvents(transmission.providerInvoiceId, headers)]
        .filter((event) => event.id !== undefined && event.status_code);
      let latest: ProviderEvent | undefined;
      for (const event of events) {
        const occurredAt = event.created_at ? new Date(event.created_at) : new Date();
        await this.prisma.electronicInvoiceEvent.upsert({
          where: { transmissionId_providerEventId: { transmissionId: transmission.id, providerEventId: String(event.id) } },
          create: {
            transmissionId: transmission.id,
            providerEventId: String(event.id),
            type: event.status_code!,
            providerStatus: event.status_code!,
            source: 'PROVIDER_SYNC',
            occurredAt,
            payload: event as Prisma.InputJsonValue,
          },
          update: { providerStatus: event.status_code!, occurredAt, payload: event as Prisma.InputJsonValue },
        });
        if (!latest || occurredAt > new Date(latest.created_at ?? 0)) latest = event;
      }
      return this.prisma.electronicInvoiceTransmission.update({
        where: { id: transmission.id },
        data: {
          status: this.mapStatus(latest?.status_code) ?? transmission.status,
          providerStatus: latest?.status_code ?? transmission.providerStatus,
          lastSyncedAt: new Date(),
          lastError: null,
        },
        include: { events: { orderBy: { occurredAt: 'desc' } } },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue.';
      console.error('[SuperPDP B2B] Status synchronization failure', {
        transmissionId: transmission.id,
        companyId,
        error: message,
      });
      await this.prisma.electronicInvoiceTransmission.update({
        where: { id: transmission.id }, data: { lastError: 'Le statut ne peut pas être mis à jour pour le moment.', lastSyncedAt: new Date() },
      });
      throw new BadGatewayException('Le statut de la facture électronique ne peut pas être mis à jour pour le moment.');
    }
  }

  private async listAllProviderEvents(providerInvoiceId: string, headers: HeadersInit): Promise<ProviderEvent[]> {
    const events: ProviderEvent[] = [];
    let startingAfterId: string | undefined;
    do {
      const url = new URL('https://api.superpdp.tech/v1.beta/invoice_events');
      url.searchParams.set('invoice_id', providerInvoiceId);
      url.searchParams.set('limit', '1000');
      if (startingAfterId) url.searchParams.set('starting_after_id', startingAfterId);
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('SuperPDP ne permet pas encore de lire le statut de cette facture.');
      const page = await response.json() as { data?: ProviderEvent[]; has_after?: boolean };
      const batch = page.data ?? [];
      events.push(...batch);
      const lastId = batch.at(-1)?.id;
      if (!page.has_after || lastId === undefined) break;
      startingAfterId = String(lastId);
    } while (true);
    return events;
  }

  async getTransmission(input: { companyId: string; documentId: string; user: User }) {
    await this.findDocument(input);
    return this.prisma.electronicInvoiceTransmission.findUnique({
      where: { documentId_provider_flow: { documentId: input.documentId, provider: 'SUPER_PDP', flow: 'B2B_FR' } },
      include: { events: { orderBy: { occurredAt: 'desc' } } },
    });
  }

  private async findDocument(input: { companyId: string; documentId: string; user: User }) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: input.documentId,
        companyId: input.companyId,
        type: 'INVOICE',
        company: { OR: [{ ownerId: input.user.id }, { companyUsers: { some: { userId: input.user.id, role: 'ADMIN', isHidden: false } } }] },
      },
    });
    if (!document) throw new NotFoundException('Facture introuvable ou accès non autorisé.');
    return document;
  }

  private async validateElectronicInvoice(file: Buffer, documentNumber: string, extension: 'pdf' | 'xml') {
    const form = new FormData();
    form.append(
      'file',
      new Blob([Uint8Array.from(file)], { type: 'application/pdf' }),
      `invoice-${documentNumber}.${extension}`,
    );
    let response: Response;
    try {
      response = await fetch('https://api.superpdp.tech/v1.beta/validation_reports', {
        method: 'POST',
        body: form,
      });
    } catch {
      throw new BadGatewayException('Le service de validation SuperPDP est indisponible.');
    }
    if (!response.ok) {
      throw new BadGatewayException(`SuperPDP ne peut pas valider la facture électronique (HTTP ${response.status}).`);
    }
    const result = await response.json() as {
      data?: Array<{ is_valid?: boolean; error?: string; subreports?: Array<{ error?: string }> }>;
    };
    const report = result.data?.[0];
    if (!report?.is_valid) {
      const details = [report?.error, ...(report?.subreports?.map((item) => item.error) ?? [])]
        .filter((value): value is string => Boolean(value))
        .join(' ')
        .slice(0, 1500);
      throw new BadRequestException(
        details
          ? `La facture électronique n’est pas valide pour SuperPDP : ${details}`
          : 'La facture électronique n’est pas valide pour SuperPDP.',
      );
    }
  }

  private mapStatus(status?: string): ElectronicInvoiceTransmissionStatus | undefined {
    const statuses: Record<string, ElectronicInvoiceTransmissionStatus> = {
      'api:uploaded': 'SUBMITTED', 'api:validated': 'SUBMITTED', 'api:sent': 'SENT', 'api:received': 'DELIVERED',
      'api:acknowledged': 'DELIVERED', 'api:accepted': 'ACCEPTED', 'api:invalid': 'INVALID', 'api:rejected': 'REJECTED',
      'fr:200': 'SUBMITTED', 'fr:201': 'SENT', 'fr:202': 'DELIVERED', 'fr:203': 'DELIVERED', 'fr:204': 'DELIVERED',
      'fr:205': 'ACCEPTED', 'fr:206': 'PARTIALLY_ACCEPTED', 'fr:207': 'DISPUTED', 'fr:208': 'ON_HOLD',
      'fr:209': 'COMPLETED', 'fr:210': 'REFUSED', 'fr:213': 'REJECTED', 'fr:501': 'INVALID',
    };
    return status ? statuses[status] : undefined;
  }
}
