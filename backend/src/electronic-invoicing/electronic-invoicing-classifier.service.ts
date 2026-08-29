export type ElectronicInvoiceFlow =
  | 'B2B_FR'
  | 'B2C_FR'
  | 'B2B_INTERNATIONAL'
  | 'B2G'
  | 'EXEMPT'
  | 'OUT_OF_SCOPE';

export type ElectronicInvoiceClientType =
  | 'INDIVIDUAL'
  | 'BUSINESS'
  | 'PUBLIC_BODY'
  | 'FOREIGN';

export type ElectronicInvoiceOperationNature = 'GOODS' | 'SERVICES' | 'MIXED';

export interface ElectronicInvoiceClassificationInput {
  sellerCountry: string;
  clientCountry: string;
  clientType: ElectronicInvoiceClientType;
  clientIsVatTaxable?: boolean;
  operationNature: ElectronicInvoiceOperationNature;
  isVatExempt: boolean;
  isOutOfScope: boolean;
  vatDueOnCollection: boolean;
}

export interface ElectronicInvoiceClassification {
  flow: ElectronicInvoiceFlow;
  reason: string;
  requiresElectronicInvoice: boolean;
  requiresTransactionReporting: boolean;
  requiresPaymentReporting: boolean;
}

/**
 * Centralises the product routing rules. It deliberately does not infer legal
 * status from a SIREN: client category and VAT-taxable status are explicit.
 */
export class ElectronicInvoicingClassifierService {
  classify(
    input: ElectronicInvoiceClassificationInput,
  ): ElectronicInvoiceClassification {
    if (input.isOutOfScope) {
      return this.result(
        'OUT_OF_SCOPE',
        'L’opération est indiquée comme hors champ de la facturation électronique française.',
        false,
        false,
        false,
      );
    }

    if (input.isVatExempt) {
      return this.result(
        'EXEMPT',
        'L’opération est indiquée comme exonérée de TVA ; sa déclaration doit être validée selon son fondement juridique.',
        false,
        false,
        false,
      );
    }

    const sellerIsFrench = this.isFrance(input.sellerCountry);
    const clientIsFrench = this.isFrance(input.clientCountry);

    if (!sellerIsFrench) {
      return this.result(
        'OUT_OF_SCOPE',
        'Le vendeur n’est pas établi en France ; cette règle de routage ne couvre pas son régime.',
        false,
        false,
        false,
      );
    }

    if (input.clientType === 'PUBLIC_BODY' && clientIsFrench) {
      return this.result(
        'B2G',
        'Le destinataire est une administration française : le circuit Chorus Pro doit être utilisé.',
        false,
        false,
        false,
      );
    }

    if (
      clientIsFrench &&
      input.clientType === 'BUSINESS' &&
      input.clientIsVatTaxable === true
    ) {
      return this.result(
        'B2B_FR',
        'Vente B2B entre un vendeur français et un client français assujetti.',
        true,
        false,
        false,
      );
    }

    if (clientIsFrench && input.clientType === 'INDIVIDUAL') {
      return this.result(
        'B2C_FR',
        'Vente à un particulier français : e-reporting de transaction requis.',
        false,
        true,
        input.vatDueOnCollection,
      );
    }

    if (
      !clientIsFrench &&
      (input.clientType === 'BUSINESS' || input.clientType === 'FOREIGN') &&
      input.clientIsVatTaxable === true
    ) {
      return this.result(
        'B2B_INTERNATIONAL',
        'Vente B2B internationale : e-reporting de transaction requis.',
        false,
        true,
        input.vatDueOnCollection,
      );
    }

    return this.result(
      'OUT_OF_SCOPE',
      'Les informations disponibles ne permettent pas de classer cette opération sans validation réglementaire.',
      false,
      false,
      false,
    );
  }

  private isFrance(country: string): boolean {
    return ['FR', 'FRA', 'FRANCE'].includes(country.trim().toUpperCase());
  }

  private result(
    flow: ElectronicInvoiceFlow,
    reason: string,
    requiresElectronicInvoice: boolean,
    requiresTransactionReporting: boolean,
    requiresPaymentReporting: boolean,
  ): ElectronicInvoiceClassification {
    return {
      flow,
      reason,
      requiresElectronicInvoice,
      requiresTransactionReporting,
      requiresPaymentReporting,
    };
  }
}
