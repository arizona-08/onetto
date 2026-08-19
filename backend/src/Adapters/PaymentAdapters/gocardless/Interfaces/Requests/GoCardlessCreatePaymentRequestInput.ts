export type GoCardlessOpenBankingScheme =
  | 'faster_payments'
  | 'sepa_credit_transfer'
  | 'sepa_instant_credit_transfer'
  | 'pay_to';

export interface GoCardlessCreatePaymentRequestInput {
  payment_request: {
    description: string;
    amount: number;
    currency: string;
    scheme: GoCardlessOpenBankingScheme;
  }
}
