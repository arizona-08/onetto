import { Document, PublicNegociation } from "@/app/types";
import { apiServer } from "../api-server";

type EstimatesAndInvoicesType = {
  estimates: Document[];
  invoices: Document[];
}

export type PaginatedDocuments = {
  documents: Document[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export async function getMyDocumentsServer(withServices: boolean = true) {
  return apiServer<EstimatesAndInvoicesType>(`api/documents/mines?with-services=${withServices}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  });
}

export async function getDocumentsPageServer(type: 'INVOICE' | 'ESTIMATE', page = 1) {
  return apiServer<PaginatedDocuments>(`api/documents/mines?with-services=false&type=${type}&page=${page}&pageSize=5`, {
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
