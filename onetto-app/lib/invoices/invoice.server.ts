import { Invoice } from "@/app/types";
import { apiServer } from "../api-server";

export async function getMyInvoicesAndEstimatesServer(withServices: boolean = true) {
  return apiServer<Invoice[]>(`api/estimates-invoices/mines?with-services=${withServices}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  });
}

export async function getEstimateInvoiceByIdServer(invoiceId: string, withServices: boolean = true) {
  return apiServer<Invoice>(`api/estimates-invoices/${invoiceId}?with-services=${withServices}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  });
}