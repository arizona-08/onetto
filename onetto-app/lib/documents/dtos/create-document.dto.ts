import { Client, DocumentDates, ServiceLineItem } from "@/app/types";

export interface CreateDocumentDto {
  type?: 'ESTIMATE' | 'INVOICE',
  client: Omit<Client, 'id'>,
  lineItems: ServiceLineItem[],
  documentDates: DocumentDates,
  instalmentsDetails?: {
    numberOfInstalments: 2 | 3,
    firstDueDate: string,
  },
}
