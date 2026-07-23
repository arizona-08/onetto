import { Invoice } from "@/app/types";
import { apiClient } from "../api";
import { CreateInvoiceDto } from "./dtos/create-invoice.dto";
import { CreateInvoiceResponse } from "./responses/create-invoice.response";

export async function createInvoice(data: CreateInvoiceDto) {
  return apiClient<CreateInvoiceResponse>("api/invoices/create", {
    method: "POST",
    body: JSON.stringify(data)
  })
}

export async function getMyInvoices(withServices: boolean = true) {
  return apiClient<Invoice[]>(`api/invoices/mines?with-services=${withServices}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  })
}