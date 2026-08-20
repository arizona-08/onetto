import { Client, DocumentDates, ServiceLineItem } from "@/app/types";

export interface CreateDocumentDto {
  type?: 'ESTIMATE' | 'INVOICE',
  client: Omit<Client, 'id'>,
  lineItems: ServiceLineItem[],
  documentDates: DocumentDates,
  paymentMode?: 'ONE_TIME' | 'INSTALMENTS',
  instalmentsDetails?: {
    frequency: 'BIWEEKLY' | 'MONTHLY',
    numberOfInstalments: 2 | 3,
    amountPerInstalmentInCents: number,
  }
}
