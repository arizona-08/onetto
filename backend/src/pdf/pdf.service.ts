import { Injectable } from '@nestjs/common';
import type { CompanyLegalStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { S3StorageService } from 'src/storage/s3-storage.service';

type InvoicePdfData = {
  type: 'INVOICE' | 'ESTIMATE';
  documentNumber: string | null;
  createdAt: Date;
  sentAt: Date | null;
  paymentDueAt: Date;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientPostalCode: string;
  clientCity: string;
  clientCountry: string;
  clientType?: 'BUSINESS' | 'INDIVIDUAL' | 'PUBLIC_BODY' | 'FOREIGN' | null;
  clientSiren?: string | null;
  clientVatNumber?: string | null;
  totalPrice: number;
  totalPriceExcludingTax: number;
  invoicePaymentMode?: {
    paymentMode: 'ONE_TIME' | 'INSTALMENTS';
    numberOfInstalments: number | null;
    firstDueDate: Date | null;
  } | null;
  services: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    taxRate: number | null;
    totalPrice: number;
  }>;
  contractStageInvoice?: {
    kind: 'DEPOSIT' | 'BALANCE';
    sequence: number;
    percentage: number;
    plan: {
      totalAmountInCents: number;
      estimate: {
        documentNumber: string | null;
        totalPriceExcludingTax: number;
        services: InvoicePdfData['services'];
      };
      stages: Array<{
        kind: 'DEPOSIT' | 'BALANCE';
        invoice: {
          documentNumber: string | null;
          totalPrice: number;
          sentAt: Date | null;
          createdAt: Date;
        } | null;
      }>;
    };
  } | null;
  company: {
    id?: string;
    logo?: { s3Key?: string | null; contentType?: string | null } | null;
    name: string;
    email: string;
    phoneNumber: string;
    siren: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    vatNumber: string | null;
    legalStatus?: CompanyLegalStatus | null;
    bank?: string | null;
    IBAN: string;
    BIC: string;
  };
};

const currency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
    value,
  );
const date = (value: Date) => new Intl.DateTimeFormat('fr-FR').format(value);
const primary = '#454ADE';
const text = '#171824';
const muted = '#676B7B';
const border = '#E5E6EF';
const legalStatusLabels: Record<CompanyLegalStatus, string> = {
  MICRO_ENTERPRISE: 'Micro-entreprise',
  INDIVIDUAL_ENTREPRENEUR: 'Entrepreneur individuel',
  EIRL: 'EIRL',
  EURL: 'EURL',
  SARL: 'SARL',
  SELARL: 'SELARL',
  SASU: 'SASU',
  SAS: 'SAS',
  SELAS: 'SELAS',
  SA: 'SA',
  SELAFA: 'SELAFA',
  SCA: 'Société en commandite par actions',
  SELCA: 'SELCA',
  SNC: 'SNC',
  SCS: 'Société en commandite simple',
  SLP: 'Société de libre partenariat',
  SOCIETE_CIVILE: 'Société civile',
  SCI: 'SCI',
  SCM: 'SCM',
  SCP: 'SCP',
  EARL: 'EARL',
  GAEC: 'GAEC',
  SCEA: 'SCEA',
  GIE: 'GIE',
  ASSOCIATION: 'Association',
  FONDATION: 'Fondation',
  MUTUELLE: 'Mutuelle',
  COOPERATIVE: 'Coopérative',
  ETABLISSEMENT_PUBLIC: 'Établissement public',
  COLLECTIVITE_TERRITORIALE: 'Collectivité territoriale',
  SOCIETE_ETRANGERE: 'Société étrangère',
  OTHER: 'Autre forme juridique',
};

@Injectable()
export class PdfService {
  constructor(private readonly storage: S3StorageService) {}

  async generate(data: InvoicePdfData): Promise<Buffer> {
    let logo: Buffer | null = null;
    if (data.company.logo?.s3Key && data.company.id) {
      logo = await this.storage.getCompanyLogo(
        data.company.id,
        data.company.logo.s3Key,
      );
      if (data.company.logo.contentType === 'image/svg+xml') {
        // PDFKit needs raster data; the SVG in S3 remains untouched.
        logo = await sharp(logo, { density: 144, limitInputPixels: 16_000_000 })
          .png()
          .toBuffer();
      }
    }
    return new Promise((resolve, reject) => {
      const pdf = new PDFDocument({
        size: 'A4',
        margin: 42,
        bufferPages: true,
      });
      const chunks: Buffer[] = [];
      pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);

      const isInvoice = data.type === 'INVOICE';
      const stage = data.contractStageInvoice;
      const isFinal = stage?.kind === 'BALANCE';
      const title = isInvoice ? 'FACTURE' : 'DEVIS';
      const displayedServices = isFinal
        ? stage.plan.estimate.services
        : data.services;
      const displayedGross = isFinal
        ? stage.plan.totalAmountInCents / 100
        : data.totalPrice;
      const displayedNet = isFinal
        ? stage.plan.estimate.totalPriceExcludingTax
        : data.totalPriceExcludingTax;
      const issueDateLabel = isInvoice ? 'DATE D’ÉMISSION' : 'DATE DU DEVIS';
      const dueDateLabel = isInvoice ? 'DATE D’ÉCHÉANCE' : 'VALABLE JUSQU’AU';
      const issueDate = isInvoice
        ? (data.sentAt ?? new Date())
        : data.createdAt;

      let partyTop = 132;
      if (logo?.length) {
        const aspectRatio = logo.readUInt32BE(20) / logo.readUInt32BE(16);
        const logoWidth = Math.min(112, 140 / aspectRatio);
        pdf.image(logo, 42, 44, { width: logoWidth });
        partyTop = Math.max(partyTop, 44 + logoWidth * aspectRatio + 30);
      } else {
        pdf
          .fillColor(primary)
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('Onetto', 42, 55);
      }
      pdf
        .fillColor(text)
        .font('Helvetica-Bold')
        .fontSize(30)
        .text(title, 275, 48, { width: 278, align: 'right' });
      pdf
        .fillColor(muted)
        .font('Helvetica')
        .fontSize(10)
        .text(`N° ${data.documentNumber ?? ''}`, 275, 94, {
          width: 278,
          align: 'right',
        });
      if (stage) {
        pdf
          .fillColor(primary)
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(
            `${stage.kind === 'DEPOSIT' ? `Acompte ${stage.sequence} · ${stage.percentage} %` : 'Solde'} du devis ${stage.plan.estimate.documentNumber ?? ''}`,
            275,
            111,
            { width: 278, align: 'right' },
          );
      }

      const sellerBottom = this.party(
        pdf,
        42,
        partyTop,
        'ÉMISE PAR',
        data.company.name,
        [
          data.company.address,
          `${data.company.postalCode}, ${data.company.city}`,
        ],
        [
          data.company.legalStatus
            ? `Statut : ${legalStatusLabels[data.company.legalStatus]}`
            : '',
          data.company.phoneNumber ? `Tél. : ${data.company.phoneNumber}` : '',
          `SIREN : ${data.company.siren}`,
          data.company.vatNumber
            ? `TVA intracommunautaire : ${data.company.vatNumber}`
            : '',
          `Email : ${data.company.email}`,
        ],
      );
      const buyerBottom = this.party(
        pdf,
        325,
        partyTop,
        'À L’ATTENTION DE',
        data.clientName,
        [
          data.clientAddress,
          `${data.clientPostalCode}, ${data.clientCity}, ${data.clientCountry}`,
        ],
        [
          `Email : ${data.clientEmail}`,
          data.clientType === 'BUSINESS' && data.clientSiren
            ? `SIREN : ${data.clientSiren}`
            : '',
          data.clientType === 'BUSINESS' && data.clientVatNumber
            ? `TVA intracommunautaire : ${data.clientVatNumber}`
            : '',
        ],
      );

      const datesTop = Math.max(sellerBottom, buyerBottom) + 18;
      pdf
        .moveTo(42, datesTop)
        .lineTo(553, datesTop)
        .strokeColor(border)
        .lineWidth(0.8)
        .stroke();
      pdf
        .fillColor(muted)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(issueDateLabel, 42, datesTop + 17)
        .text(dueDateLabel, 300, datesTop + 17);
      pdf
        .fillColor(text)
        .font('Helvetica')
        .fontSize(10)
        .text(date(issueDate), 42, datesTop + 32)
        .text(date(data.paymentDueAt), 300, datesTop + 32);
      pdf
        .moveTo(42, datesTop + 65)
        .lineTo(553, datesTop + 65)
        .strokeColor(border)
        .stroke();

      let y = datesTop + 84;
      const columns = [42, 227, 265, 332, 387, 427, 487];
      const widths = [185, 38, 67, 55, 40, 60, 66];
      y = this.tableHeader(pdf, y, columns);
      for (const service of displayedServices) {
        const net = service.quantity * service.unitPrice;
        pdf.font('Helvetica').fontSize(8);
        const rowHeight = Math.max(
          32,
          pdf.heightOfString(service.description, { width: widths[0] - 8 }) +
            16,
        );
        if (y + rowHeight > 650) {
          pdf.addPage();
          y = this.tableHeader(pdf, 50, columns);
        }
        pdf
          .fillColor(text)
          .font('Helvetica')
          .fontSize(8)
          .text(service.description, columns[0] + 3, y + 10, {
            width: widths[0] - 8,
          });
        pdf.text(String(service.quantity), columns[1] + 3, y + 10, {
          width: widths[1] - 6,
        });
        pdf.text(currency(service.unitPrice), columns[2] + 3, y + 10, {
          width: widths[2] - 6,
        });
        pdf.text(service.unit, columns[3] + 3, y + 10, {
          width: widths[3] - 6,
        });
        pdf.text(`${service.taxRate ?? 0} %`, columns[4] + 3, y + 10, {
          width: widths[4] - 6,
        });
        pdf.text(currency(net), columns[5] + 3, y + 10, {
          width: widths[5] - 6,
          align: 'right',
        });
        pdf
          .font('Helvetica-Bold')
          .text(currency(service.totalPrice), columns[6] + 3, y + 10, {
            width: widths[6] - 6,
            align: 'right',
          });
        pdf
          .moveTo(42, y + rowHeight)
          .lineTo(553, y + rowHeight)
          .strokeColor(border)
          .stroke();
        y += rowHeight;
      }
      let boxY = y + 20;
      const summaryHeight = isFinal
        ? 270
        : !isInvoice && data.invoicePaymentMode?.paymentMode === 'INSTALMENTS'
          ? 290
          : 220;
      if (boxY + summaryHeight > pdf.page.height - 42) {
        pdf.addPage();
        boxY = 65;
      }
      const vat = displayedGross - displayedNet;
      pdf.rect(362, boxY, 191, isFinal ? 134 : 100).fill('#F3F4F9');
      this.total(pdf, boxY + 15, 'Sous-total :', currency(displayedNet), false);
      this.total(pdf, boxY + 37, 'Total TVA :', currency(vat), false);
      pdf
        .moveTo(372, boxY + 61)
        .lineTo(543, boxY + 61)
        .strokeColor(border)
        .stroke();
      this.total(
        pdf,
        boxY + 70,
        'TOTAL TTC :',
        currency(displayedGross),
        !isFinal,
      );
      if (isFinal) {
        this.total(
          pdf,
          boxY + 92,
          'Acomptes encaissés',
          `− ${currency(displayedGross - data.totalPrice)}`,
          false,
        );
        this.total(
          pdf,
          boxY + 110,
          'Solde à payer',
          currency(data.totalPrice),
          true,
        );
      }
      const bankY = boxY + (isFinal ? 162 : 128);
      pdf.moveTo(42, bankY).lineTo(553, bankY).strokeColor(border).stroke();
      pdf
        .fillColor(text)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('Coordonnées bancaires', 42, bankY + 17)
        .fontSize(8)
        .text(`Titulaire : ${data.company.name}`, 42, bankY + 40, {
          width: 235,
        })
        .text(`IBAN : ${data.company.IBAN}`, 300, bankY + 40, {
          width: 253,
        })
        .text(`BIC : ${data.company.BIC}`, 300, bankY + 58, {
          width: 253,
        });
      if (data.company.bank) {
        pdf.text(`Banque : ${data.company.bank}`, 42, bankY + 58, {
          width: 235,
        });
      }
      if (isFinal) {
        const references = stage.plan.stages
          .filter((item) => item.kind === 'DEPOSIT' && item.invoice)
          .map((item) => item.invoice!.documentNumber)
          .join(', ');
        pdf
          .fontSize(8)
          .fillColor(muted)
          .text(
            `Factures d’acompte déjà encaissées : ${references}`,
            42,
            bankY + 82,
            { width: 235 },
          );
      }
      if (
        !isInvoice &&
        data.invoicePaymentMode?.paymentMode === 'INSTALMENTS'
      ) {
        const paymentTermsY = bankY + (isFinal ? 112 : 82);
        pdf
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(text)
          .text('CONDITIONS DE PAIEMENT', 42, paymentTermsY);
        pdf
          .font('Helvetica')
          .fontSize(9)
          .fillColor(muted)
          .text(
            `Paiement en ${data.invoicePaymentMode.numberOfInstalments} échéances hebdomadaires${data.invoicePaymentMode.firstDueDate ? `, à partir du ${date(data.invoicePaymentMode.firstDueDate)}` : ''}.`,
            42,
            paymentTermsY + 16,
            { width: 510 },
          );
      }
      const closingY =
        !isInvoice && data.invoicePaymentMode?.paymentMode === 'INSTALMENTS'
          ? bankY + 125
          : bankY + 82;
      pdf
        .fillColor(muted)
        .font('Helvetica')
        .fontSize(7.5)
        .text('Merci pour votre confiance.', 300, closingY, {
          width: 253,
          align: 'right',
        })
        .fillColor(text)
        .text(
          `${isInvoice ? 'Facture' : 'Devis'} fait avec Onetto`,
          300,
          closingY + 14,
          {
            width: 253,
            align: 'right',
          },
        );
      pdf.end();
    });
  }

  private tableHeader(
    pdf: PDFKit.PDFDocument,
    y: number,
    columns: number[],
  ): number {
    pdf.rect(42, y, 511, 28).fill('#F3F4F9');
    pdf.fillColor(muted).font('Helvetica-Bold').fontSize(7);
    [
      'DESCRIPTION',
      'QTÉ',
      'PRIX HT',
      'UNITÉ',
      'TVA',
      'TOTAL HT',
      'TOTAL TTC',
    ].forEach((label, index) =>
      pdf.text(label, columns[index] + 3, y + 10, {
        width: columns[index + 1]
          ? columns[index + 1] - columns[index] - 6
          : 60,
        align: index >= 5 ? 'right' : 'left',
      }),
    );
    return y + 28;
  }

  private party(
    pdf: PDFKit.PDFDocument,
    x: number,
    y: number,
    title: string,
    name: string,
    addressLines: string[],
    details: string[],
  ): number {
    pdf
      .fillColor(muted)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(title, x, y, { width: 228 });
    pdf
      .fillColor(text)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(name, x, y + 16, { width: 228 });
    let nextY = y + 16 + pdf.heightOfString(name, { width: 228 }) + 4;
    pdf.fillColor(text).font('Helvetica').fontSize(9);
    for (const line of addressLines.filter(Boolean)) {
      pdf.text(line, x, nextY, { width: 228 });
      nextY += pdf.heightOfString(line, { width: 228 }) + 2;
    }
    nextY += 7;
    for (const detail of details.filter(Boolean)) {
      pdf.fillColor(muted).font('Helvetica').fontSize(7.5);
      pdf.text(detail, x, nextY, { width: 228 });
      nextY += pdf.heightOfString(detail, { width: 228 }) + 4;
    }
    return nextY;
  }

  private total(
    pdf: PDFKit.PDFDocument,
    y: number,
    label: string,
    value: string,
    highlighted: boolean,
  ) {
    pdf
      .fillColor(highlighted ? text : muted)
      .font(highlighted ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(highlighted ? 11 : 9)
      .text(label, 372, y, { width: 95 })
      .text(value, 467, y, { width: 76, align: 'right' });
  }
}
