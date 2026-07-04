import { Client, InvoiceDates, ServiceLineItem } from "@/app/types";

export interface CreateInvoiceDto {
  client: Client,
  lineItems: ServiceLineItem[],
  invoiceDates: InvoiceDates
}