import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

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
  services: Array<{ description: string; quantity: number; unit: string; unitPrice: number; taxRate: number | null; totalPrice: number }>;
  company: { name: string; email: string; phoneNumber: string; siren: string; address: string; postalCode: string; city: string; country: string; vatNumber: string | null; IBAN: string; BIC: string };
};

const currency = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
const date = (value: Date) => new Intl.DateTimeFormat('fr-FR').format(value);
const primary = '#635BFF';
const muted = '#71717A';

@Injectable()
export class PdfService {
  async generate(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const pdf = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true });
      const chunks: Buffer[] = [];
      pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);

      const width = pdf.page.width - 84;
      const isInvoice = data.type === 'INVOICE';
      const title = isInvoice ? 'FACTURE' : 'DEVIS';
      const issueDateLabel = isInvoice ? 'DATE D’ÉMISSION' : 'DATE DU DEVIS';
      const dueDateLabel = isInvoice ? 'DATE D’ÉCHÉANCE' : 'VALABLE JUSQU’AU';
      const issueDate = isInvoice ? (data.sentAt ?? new Date()) : data.createdAt;

      pdf.fillColor(primary).font('Helvetica').fontSize(42).text(title, 42, 42);
      pdf.roundedRect(42, 88, 110, 19, 9).strokeColor('#18181B').lineWidth(0.7).stroke();
      pdf.fillColor('#18181B').fontSize(9).text(`n° ${data.documentNumber ?? ''}`, 51, 94);
      pdf.roundedRect(477, 42, 75, 75, 6).fill(primary);
      pdf.fillColor(muted).font('Helvetica-Bold').fontSize(9).text(issueDateLabel, 42, 130);
      pdf.fillColor('#18181B').font('Helvetica').fontSize(10).text(date(issueDate), 42, 144);
      pdf.fillColor(muted).font('Helvetica-Bold').fontSize(9).text(dueDateLabel, 42, 165);
      pdf.fillColor('#18181B').font('Helvetica').fontSize(10).text(date(data.paymentDueAt), 42, 179);
      pdf.moveTo(42, 211).lineTo(553, 211).strokeColor('#E4E4E7').stroke();

      this.party(pdf, 42, 234, 'ÉMISE PAR', [data.company.name, data.company.address, `${data.company.postalCode} ${data.company.city}, ${data.company.country}`, `SIREN : ${data.company.siren}`, data.company.vatNumber ? `TVA : ${data.company.vatNumber}` : '', `${data.company.email} · ${data.company.phoneNumber}`]);
      this.party(pdf, 325, 234, 'À L’ATTENTION DE', [
        data.clientName,
        data.clientEmail,
        data.clientType === 'BUSINESS' && data.clientSiren ? `SIREN : ${data.clientSiren}` : '',
        data.clientType === 'BUSINESS' && data.clientVatNumber ? `TVA : ${data.clientVatNumber}` : '',
        data.clientAddress,
        `${data.clientPostalCode} ${data.clientCity}, ${data.clientCountry}`,
      ], true);

      let y = 344;
      const columns = [42, 245, 314, 397, 465];
      pdf.roundedRect(42, y, width, 25, 5).fill('#EEEDFF');
      pdf.fillColor('#52525B').font('Helvetica-Bold').fontSize(8);
      ['DESCRIPTION', 'QTÉ', 'PRIX HT', 'TVA', 'TOTAL TTC'].forEach((label, index) => pdf.text(label, columns[index], y + 9, { width: index === 4 ? 87 : undefined, align: index === 4 ? 'right' : 'left' }));
      y += 25;
      for (const service of data.services) {
        const rowHeight = Math.max(28, pdf.heightOfString(service.description, { width: 190 }) + 16);
        if (y + rowHeight > 650) { pdf.addPage(); y = 50; }
        pdf.fillColor('#18181B').font('Helvetica').fontSize(9).text(service.description, columns[0], y + 8, { width: 190 });
        pdf.text(`${service.quantity} ${service.unit}`, columns[1], y + 8, { width: 60 });
        pdf.text(currency(service.unitPrice), columns[2], y + 8, { width: 72 });
        pdf.text(`${service.taxRate ?? 0} %`, columns[3], y + 8, { width: 48 });
        pdf.font('Helvetica-Bold').text(currency(service.totalPrice), columns[4], y + 8, { width: 87, align: 'right' });
        pdf.moveTo(42, y + rowHeight).lineTo(553, y + rowHeight).strokeColor('#F1F1F2').stroke();
        y += rowHeight;
      }
      const boxY = Math.max(y + 25, 515); const vat = data.totalPrice - data.totalPriceExcludingTax;
      pdf.roundedRect(340, boxY, 213, 94, 9).fill('#FAFAFA');
      this.total(pdf, boxY + 15, 'Sous-total', currency(data.totalPriceExcludingTax), false);
      this.total(pdf, boxY + 37, 'TVA', currency(vat), false);
      pdf.moveTo(355, boxY + 61).lineTo(538, boxY + 61).strokeColor('#E4E4E7').stroke();
      this.total(pdf, boxY + 70, 'Total TTC', currency(data.totalPrice), true);
      const bankY = boxY + 123;
      pdf.moveTo(42, bankY).lineTo(553, bankY).strokeColor('#E4E4E7').stroke();
      pdf.fillColor('#18181B').font('Helvetica-Bold').fontSize(9).text('COORDONNÉES BANCAIRES', 42, bankY + 16);
      pdf.fillColor(muted).font('Helvetica').fontSize(9).text(`IBAN : ${data.company.IBAN}`, 42, bankY + 31).text(`BIC : ${data.company.BIC}`, 42, bankY + 45);
      pdf.end();
    });
  }

  private party(pdf: PDFKit.PDFDocument, x: number, y: number, title: string, lines: string[], right = false) {
    pdf.fillColor(muted).font('Helvetica-Bold').fontSize(8).text(title, x, y, { width: 228, align: right ? 'right' : 'left' });
    lines.filter(Boolean).forEach((line, index) => pdf.fillColor(index === 0 ? '#18181B' : '#52525B').font(index === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(index === 0 ? 11 : 9).text(line, x, y + 16 + index * 14, { width: 228, align: right ? 'right' : 'left' }));
  }

  private total(pdf: PDFKit.PDFDocument, y: number, label: string, value: string, highlighted: boolean) {
    pdf.fillColor(highlighted ? primary : muted).font(highlighted ? 'Helvetica-Bold' : 'Helvetica').fontSize(highlighted ? 11 : 9).text(label, 355, y, { width: 95 }).text(value, 450, y, { width: 88, align: 'right' });
  }
}
