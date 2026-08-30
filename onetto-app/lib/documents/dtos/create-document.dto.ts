import { Client, DocumentDates, ServiceLineItem } from "@/app/types";

export interface CreateDocumentDto {
  type?: 'ESTIMATE' | 'INVOICE',
  operationNature?: 'GOODS' | 'SERVICES' | 'MIXED',
  client: Omit<Client, 'id'>,
  lineItems: ServiceLineItem[],
  documentDates: DocumentDates,
  instalmentsDetails?: {
    numberOfInstalments: 2 | 3,
    firstDueDate: string,
  },
}
