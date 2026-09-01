import { BadRequestException, Injectable } from '@nestjs/common';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

@Injectable()
export class ElectronicInvoiceValidationService {
  validateFacturXPdf(content: Buffer) {
    if (content.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new BadRequestException('Le document Factur-X à archiver n’est pas un PDF valide.');
    }
  }

  validateIncomingOriginal(content: Buffer, contentType: string) {
    if (contentType === 'application/pdf') return this.validateFacturXPdf(content);
    const xml = content.toString('utf8');
    const result = XMLValidator.validate(xml);
    if (result !== true) throw new BadRequestException('La facture fournisseur XML est mal formée.');
    const parsed = new XMLParser({ removeNSPrefix: true }).parse(xml) as { Invoice?: unknown };
    if (!parsed.Invoice) throw new BadRequestException('La facture fournisseur XML ne contient pas de document UBL Invoice.');
  }
}
