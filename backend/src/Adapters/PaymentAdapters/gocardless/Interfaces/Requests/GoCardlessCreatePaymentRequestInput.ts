export type GoCardlessOpenBankingScheme =
  | 'sepa_credit_transfer'
  | 'sepa_instant_credit_transfer';

export type GoCardlessDirectDebitScheme = 'sepa_core';

export interface GoCardlessCreatePaymentRequestInput {
  payment_request?: {
    description: string;
    amount: number;
    currency: string;
    scheme: GoCardlessOpenBankingScheme;
  },
  mandate_request?: {
    scheme: GoCardlessDirectDebitScheme;
  }
}
