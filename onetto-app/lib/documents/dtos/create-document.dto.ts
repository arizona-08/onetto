import { Client, DocumentDates, ServiceLineItem } from "@/app/types";

export interface CreateDocumentDto {
  client: Omit<Client, 'id'>,
  lineItems: ServiceLineItem[],
  documentDates: DocumentDates
}