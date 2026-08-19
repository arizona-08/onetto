export type CreatePaymentLinkInput = {
  description?: string;
  companyId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  customer: {
    firstName?: string;
    lastName?: string;
    email: string;
  }
}