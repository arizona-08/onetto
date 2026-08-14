import { Document, PublicNegociation, PublicPayment } from "@/app/types";
import { apiServer } from "../api-server";

type EstimatesAndInvoicesType = {
  estimates: Document[];
  invoices: Document[];
}

export type PaginatedDocuments = {
  documents: Document[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type InvoiceStats = {
  paid: InvoiceStat;
  pending: InvoiceStat;
  overdue: InvoiceStat;
  draft: InvoiceStat;
};

type InvoiceStat = {
  count: number;
  totalAmount: number;
};

export async function getMyDocumentsServer(withServices: boolean = true) {
  return apiServer<EstimatesAndInvoicesType>(`api/documents/mines?with-services=${withServices}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  });
}

export async function getDocumentsPageServer(type: 'INVOICE' | 'ESTIMATE', page = 1, status?: string) {
  const statusQuery = status ? `&status=${encodeURIComponent(status)}` : '';
  return apiServer<PaginatedDocuments>(`api/documents/mines?with-services=false&type=${type}&page=${page}&pageSize=5${statusQuery}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getInvoiceStatsServer() {
  return apiServer<InvoiceStats>('api/documents/invoice-stats', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getDocumentByIdServer(documentId: string, withServices: boolean = true) {
  return apiServer<Document>(`api/documents/${documentId}?with-services=${withServices}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  });
}

export async function getNegociationByTokenServer(token: string) {
  return apiServer<PublicNegociation>(`api/negociations/${encodeURIComponent(token)}`, {
    method: "GET",
    cache: "no-store",
  });
}

export async function getPublicPaymentServer(token: string) {
  return apiServer<PublicPayment>(`api/public/payments?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    cache: 'no-store',
  });
}
