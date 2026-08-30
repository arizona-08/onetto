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
    if (!document.clientElectronicAddress || !document.clientElectronicAddressScheme) {
      throw new BadRequestException('Sélectionnez une adresse électronique de réception dans l’annuaire avant la transmission.');
    }

    const existing = await this.prisma.electronicInvoiceTransmission.findUnique({
      where: { documentId_provider_flow: { documentId: document.id, provider: 'SUPER_PDP', flow: 'B2B_FR' } },
    });
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
        : document.facturXContent
          ? Buffer.from(document.facturXContent)
          : await this.facturX.archive(document.id, input.user);
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
        format: 'factur-x',
        facturXBytes: facturX.length,
        facturXFingerprint: createHash('sha256').update(facturX).digest('hex'),
        operationNature: document.operationNature,
        buyer: {
          clientSiren: document.clientSiren,
          electronicAddress: document.clientElectronicAddress,
          electronicAddressScheme: document.clientElectronicAddressScheme,
        },
      });
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/pdf' },
        body: Uint8Array.from(facturX),
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
          submittedFormat: 'factur-x',
          documentFingerprint: createHash('sha256').update(facturX).digest('hex'),
          status: 'SUBMITTED',
          providerStatus: 'api:uploaded',
          submittedAt: new Date(),
          lastError: null,
        },
      });
      return this.sync(input);
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'Erreur inconnue.';
      await this.prisma.electronicInvoiceTransmission.update({
        where: { id: transmission.id },
        data: { status: 'FAILED', lastError: message },
      });
      throw new BadGatewayException(`Impossible de transmettre la facture B2B à SuperPDP : ${message}`);
    }
  }

  async sync(input: { companyId: string; documentId: string; user: User }) {
    await this.findDocument(input);
    const transmission = await this.prisma.electronicInvoiceTransmission.findUnique({
      where: { documentId_provider_flow: { documentId: input.documentId, provider: 'SUPER_PDP', flow: 'B2B_FR' } },
    });
    if (!transmission) throw new NotFoundException('Aucune transmission B2B SuperPDP pour cette facture.');
    if (!transmission.providerInvoiceId) return transmission;

    try {
      const token = await this.oauth.getAccessToken(input.companyId);
      const headers = { Authorization: `Bearer ${token}` };
      const [invoiceResponse, eventsResponse] = await Promise.all([
        fetch(`https://api.superpdp.tech/v1.beta/invoices/${encodeURIComponent(transmission.providerInvoiceId)}`, { headers }),
        fetch(`https://api.superpdp.tech/v1.beta/invoice_events?invoice_id=${encodeURIComponent(transmission.providerInvoiceId)}&limit=100`, { headers }),
      ]);
      if (!invoiceResponse.ok || !eventsResponse.ok) throw new Error('SuperPDP ne permet pas encore de lire le statut de cette facture.');
      const invoice = await invoiceResponse.json() as { events?: ProviderEvent[] };
      const eventsPayload = await eventsResponse.json() as { data?: ProviderEvent[] };
      const events = [...(invoice.events ?? []), ...(eventsPayload.data ?? [])]
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
      await this.prisma.electronicInvoiceTransmission.update({
        where: { id: transmission.id }, data: { lastError: message, lastSyncedAt: new Date() },
      });
      throw new BadGatewayException(message);
    }
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
