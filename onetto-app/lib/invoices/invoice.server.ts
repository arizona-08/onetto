import { Invoice } from "@/app/types";
import { apiServer } from "../api-server";

export async function getMyInvoicesServer(withServices: boolean = true) {
  return apiServer<Invoice[]>(`api/invoices/mines?with-services=${withServices}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  });
}

export async function getInvoiceByIdServer(invoiceId: string, withServices: boolean = true) {
  return apiServer<Invoice>(`api/invoices/${invoiceId}?with-services=${withServices}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  });
}