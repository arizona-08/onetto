import { Document, PublicNegociation } from "@/app/types";
import { apiServer } from "../api-server";

type EstimatesAndInvoicesType = {
  estimates: Document[];
  invoices: Document[];
}

export async function getMyDocumentsServer(withServices: boolean = true) {
  return apiServer<EstimatesAndInvoicesType>(`api/documents/mines?with-services=${withServices}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
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
