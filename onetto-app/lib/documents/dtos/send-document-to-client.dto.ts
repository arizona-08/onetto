export interface SendDocumentToClientDto {
  paymentMode?: 'ONE_TIME' | 'INSTALMENTS';
  instalmentsDetails?: {
    frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    numberOfInstalments: 2 | 3;
    amountPerInstalmentInCents: number;
  };
}
