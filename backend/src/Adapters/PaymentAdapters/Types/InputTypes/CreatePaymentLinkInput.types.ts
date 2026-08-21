import { $Enums } from "@prisma/client";

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
  paymentMode: 'ONE_TIME' | 'INSTALMENTS';
  instalments_details?: {
    frequency: $Enums.PaymentModeFrequency;
    numberOfInstalments: number;
    amountPerInstalmentInCents: number;
  }
}