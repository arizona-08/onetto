import { Document, DocumentNegociation, DocumentVersion } from "@/app/types";
import { apiClient } from "../api";
import { CreateDocumentDto } from "./dtos/create-document.dto";
import { CreateDocumentResponse } from "./responses/create-document.response";
import { DeleteDocumentsResponse } from "./responses/DeleteDocumentsResponse";
import { SendDocumentToClientResponse } from "./responses/send-document-to-client.response";
import type { PaginatedDocuments } from './document.server';

export async function createDocument(data: CreateDocumentDto) {
  return apiClient<CreateDocumentResponse>("api/documents/create", {
    method: "POST",
    body: JSON.stringify(data)
  })
}

export async function getMyDocuments(withServices: boolean = true) {
  return apiClient<Document[]>(`api/documents/mines?with-services=${withServices}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  })
}

export async function getDocumentsPage(type: 'INVOICE' | 'ESTIMATE', page: number) {
  return apiClient<PaginatedDocuments>(`api/documents/mines?with-services=false&type=${type}&page=${page}&pageSize=5`, {
    method: 'GET',
  });
}

export async function updateDraftDocument(documentId: string, data: CreateDocumentDto) {
  return apiClient<CreateDocumentResponse>(`api/documents/${documentId}/update-draft`, {
    method: "PUT",
    body: JSON.stringify(data)
  })
}

export async function massDeleteDocuments(documentIds: string[]) {
  return apiClient<DeleteDocumentsResponse>(`api/documents/mass-delete`, {
    method: "DELETE",
    body: JSON.stringify({ documentIds })
  })
}

export async function sendDocumentToClient(documentId: string){
  return apiClient<SendDocumentToClientResponse>(`api/documents/${documentId}/send-to-client`, {
    method: "POST",
  })
}

export async function retryInvoicePayment(documentId: string) {
  return apiClient<{ success: true; message: string }>(`api/documents/${documentId}/retry-payment`, {
    method: 'POST',
  });
}

export async function getDocumentNegociations(documentId: string) {
  return apiClient<DocumentNegociation[]>(`api/documents/${documentId}/negociations`, {
    method: "GET",
  })
}

export async function getDocumentVersions(documentId: string) {
  return apiClient<DocumentVersion[]>(`api/documents/${documentId}/versions`, {
    method: "GET",
  })
}

export async function createNewDocumentVersion(documentId: string) {
  return apiClient<{ document: Document }>(`api/documents/${documentId}/create-version`, {
    method: "POST",
  })
}

export async function convertEstimateToInvoice(estimateId: string) {
  return apiClient<{ document: Document }>(`api/documents/${estimateId}/turn-into-invoice`, {
    method: "POST",
  })
}
