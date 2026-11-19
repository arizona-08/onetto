import { BadGatewayException, Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { XMLParser } from 'fast-xml-parser';

type XmlNode = Record<string, unknown>;

const asText = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'object') return asText((value as XmlNode)['#text']);
  return typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? String(value)
    : '';
};
const first = (value: unknown): XmlNode => {
  const item: unknown = Array.isArray(value) ? value[0] : value;
  return item && typeof item === 'object' ? (item as XmlNode) : {};
};
const money = (value: unknown, currency: string) => {
  if (value == null || asText(value) === '') return '—';
  const amount = Number(asText(value));
  if (!Number.isFinite(amount)) return asText(value) || '—';
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};
const date = (value: unknown) => {
  const raw = asText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || '—';
  return `${raw.slice(8, 10)}/${raw.slice(5, 7)}/${raw.slice(0, 4)}`;
};

@Injectable()
export class SupplierInvoicePdfService {
  async render(original: Buffer): Promise<Buffer> {
    let invoice: XmlNode;
    try {
      const parsed: unknown = new XMLParser({
        removeNSPrefix: true,
        ignoreAttributes: false,
      }).parse(original.toString('utf8'));
      invoice = first(first(parsed).Invoice);
    } catch {
      throw new BadGatewayException(
        'Le fichier XML de la facture est illisible.',
      );
    }
    if (!invoice?.ID || !invoice.AccountingSupplierParty) {
      throw new BadGatewayException(
        'Cette facture XML ne peut pas être représentée en PDF pour le moment.',
      );
    }

    const currency = asText(invoice.DocumentCurrencyCode) || 'EUR';
    const supplier = first(first(invoice.AccountingSupplierParty).Party);
    const buyer = first(first(invoice.AccountingCustomerParty).Party);
    const totals = first(invoice.LegalMonetaryTotal);
    const tax = first(invoice.TaxTotal);
    const lines: unknown[] = invoice.InvoiceLine
      ? Array.isArray(invoice.InvoiceLine)
        ? invoice.InvoiceLine
        : [invoice.InvoiceLine]
      : [];

    return new Promise((resolve, reject) => {
      const pdf = new PDFDocument({
        size: 'A4',
        margin: 44,
        bufferPages: true,
      });
      const chunks: Buffer[] = [];
      pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);

      const pageWidth = pdf.page.width - 88;
      const muted = '#626B7A';
      const heading = (label: string) => {
        if (pdf.y > 700) pdf.addPage();
        pdf
          .moveDown(1.4)
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#171B2A')
          .text(label.toUpperCase());
        pdf.moveDown(0.5);
      };
      const row = (label: string, value: string) => {
        if (!value) return;
        pdf
          .font('Helvetica')
          .fontSize(9)
          .fillColor(muted)
          .text(`${label} : `, { continued: true })
          .fillColor('#171B2A')
          .text(value);
        pdf.moveDown(0.3);
      };
      const party = (label: string, partyNode: XmlNode) => {
        heading(label);
        const address = first(partyNode.PostalAddress);
        const name =
          asText(first(partyNode.PartyName).Name) ||
          asText(first(partyNode.PartyLegalEntity).RegistrationName);
        pdf
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#171B2A')
          .text(name || '—');
        row(
          'Adresse',
          [
            asText(address.StreetName),
            asText(address.AdditionalStreetName),
            [asText(address.PostalZone), asText(address.CityName)]
              .filter(Boolean)
              .join(' '),
            asText(first(address.Country).IdentificationCode),
          ]
            .filter(Boolean)
            .join(', '),
        );
        row('Identifiant', asText(first(partyNode.PartyLegalEntity).CompanyID));
        row('TVA', asText(first(partyNode.PartyTaxScheme).CompanyID));
        row('Adresse électronique', asText(partyNode.EndpointID));
      };

      pdf
        .font('Helvetica-Bold')
        .fontSize(21)
        .fillColor('#171B2A')
        .text(`FACTURE ${asText(invoice.ID)}`, { width: pageWidth });
      pdf.moveDown(0.8);
      row('Date d’émission', date(invoice.IssueDate));
      row('Date d’échéance', date(invoice.DueDate));
      row('Référence acheteur', asText(invoice.BuyerReference));
      row('Commande', asText(first(invoice.OrderReference).ID));
      party('Vendeur', supplier);
      party('Acheteur', buyer);

      const delivery = first(invoice.Delivery);
      const deliveryAddress = first(first(delivery.DeliveryLocation).Address);
      if (Object.keys(deliveryAddress).length) {
        heading('Livraison');
        row(
          'Adresse',
          [
            asText(deliveryAddress.StreetName),
            [
              asText(deliveryAddress.PostalZone),
              asText(deliveryAddress.CityName),
            ]
              .filter(Boolean)
              .join(' '),
            asText(first(deliveryAddress.Country).IdentificationCode),
          ]
            .filter(Boolean)
            .join(', '),
        );
      }

      if (lines.length) {
        heading('Articles et prestations');
        for (const rawLine of lines) {
          const line = first(rawLine);
          const description =
            asText(first(line.Item).Name) ||
            asText(first(line.Item).Description) ||
            `Ligne ${asText(line.ID)}`;
          const quantity = asText(line.InvoicedQuantity);
          const unitCode = asText(first(line.InvoicedQuantity)['@_unitCode']);
          const unitPrice = asText(first(line.Price).PriceAmount);
          const vatRate = asText(
            first(first(line.Item).ClassifiedTaxCategory).Percent,
          );
          const lineTotal = money(line.LineExtensionAmount, currency);
          const detail = [
            quantity
              ? `Quantité ${quantity}${unitCode ? ` ${unitCode}` : ''}`
              : '',
            unitPrice ? `Prix unitaire HT ${money(unitPrice, currency)}` : '',
            vatRate ? `TVA ${vatRate} %` : '',
          ]
            .filter(Boolean)
            .join(' · ');
          const requiredHeight =
            pdf.heightOfString(description, {
              width: pageWidth,
            }) + 37;
          if (pdf.y + requiredHeight > 737) pdf.addPage();
          pdf
            .moveTo(44, pdf.y)
            .lineTo(44 + pageWidth, pdf.y)
            .strokeColor('#E5E7EB')
            .stroke();
          pdf
            .moveDown(0.7)
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor('#171B2A')
            .text(description);
          pdf
            .font('Helvetica')
            .fontSize(9)
            .fillColor(muted)
            .text(detail, { continued: Boolean(detail) })
            .fillColor('#171B2A')
            .text(detail ? `  ·  ${lineTotal} HT` : `${lineTotal} HT`);
          pdf.moveDown(0.8);
        }
      }

      heading('Totaux');
      row(
        'Total HT',
        money(
          totals.TaxExclusiveAmount ?? totals.LineExtensionAmount,
          currency,
        ),
      );
      row('TVA', money(tax.TaxAmount, currency));
      row('Total TTC', money(totals.TaxInclusiveAmount, currency));
      row('Net à payer', money(totals.PayableAmount, currency));
      const paymentMeans = first(invoice.PaymentMeans);
      row('Référence de paiement', asText(paymentMeans.PaymentID));
      row('IBAN', asText(first(paymentMeans.PayeeFinancialAccount).ID));
      const paymentTerms = first(invoice.PaymentTerms);
      row('Conditions de paiement', asText(paymentTerms.Note));
      const notes = invoice.Note
        ? Array.isArray(invoice.Note)
          ? invoice.Note
          : [invoice.Note]
        : [];
      for (const note of notes) row('Note', asText(note));

      pdf
        .moveDown(1.5)
        .font('Helvetica')
        .fontSize(8)
        .fillColor(muted)
        .text(
          'PDF de lecture généré à partir du fichier XML reçu. Conservez le fichier original pour les traitements comptables et l’archivage.',
        );
      pdf.end();
    });
  }
}
