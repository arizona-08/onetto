import { Client, InvoiceDates, ServiceLineItem } from "@/app/types";

export interface CreateInvoiceDto {
  client: Omit<Client, 'id'>,
  lineItems: ServiceLineItem[],
  invoiceDates: InvoiceDates
}