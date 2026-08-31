import { Document, DocumentNegociation, DocumentVersion } from "@/app/types";
import { apiClient } from "../api";
import { CreateDocumentDto } from "./dtos/create-document.dto";
import { SendDocumentToClientDto } from "./dtos/send-document-to-client.dto";
import { CreateDocumentResponse } from "./responses/create-document.response";
import { DeleteDocumentsResponse } from "./responses/DeleteDocumentsResponse";
import { SendDocumentToClientResponse } from "./responses/send-document-to-client.response";
import type { PaginatedDocuments } from "./document.server";

export async function createDocument(data: CreateDocumentDto) {
  return apiClient<CreateDocumentResponse>("api/documents/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMyDocuments(withServices: boolean = true) {
  return apiClient<Document[]>(
    `api/documents/mines?with-services=${withServices}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

export async function getDocumentsPage(
  type: "INVOICE" | "ESTIMATE",
  page: number,
  status?: string,
) {
  const statusQuery = status ? `&status=${encodeURIComponent(status)}` : "";
  return apiClient<PaginatedDocuments>(
    `api/documents/mines?with-services=false&type=${type}&page=${page}&pageSize=5${statusQuery}`,
    {
      method: "GET",
    },
  );
}

export async function updateDraftDocument(
  documentId: string,
  data: CreateDocumentDto,
) {
  return apiClient<CreateDocumentResponse>(
    `api/documents/${documentId}/update-draft`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
}

export async function massDeleteDocuments(documentIds: string[]) {
  return apiClient<DeleteDocumentsResponse>(`api/documents/mass-delete`, {
    method: "DELETE",
    body: JSON.stringify({ documentIds }),
  });
}

export async function deleteDraftDocument(documentId: string) {
  return apiClient<{ success: true; message: string }>(
    `api/documents/${documentId}/draft`,
    { method: 'DELETE' },
  );
}

export async function sendDocumentToClient(
  documentId: string,
  data?: SendDocumentToClientDto,
) {
  return apiClient<SendDocumentToClientResponse>(
    `api/documents/${documentId}/send-to-client`,
    {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    },
  );
}

export async function retryInvoicePayment(documentId: string) {
  return apiClient<{ success: true; message: string }>(
    `api/documents/${documentId}/retry-payment`,
    {
      method: "POST",
    },
  );
}

export type SuperPdpDirectoryCompany = {
  number: string;
  formal_name: string;
  address: string;
  postcode: string;
  city: string;
  country: string;
};

export type SuperPdpDirectoryEntry = {
  identifier: string;
  is_active: boolean;
  company: SuperPdpDirectoryCompany;
};

export function searchSuperPdpDirectory(query: string) {
  return apiClient<{ data: SuperPdpDirectoryCompany[]; has_more: boolean }>(
    `api/electronic-invoicing/superpdp/directory/companies?query=${encodeURIComponent(query)}`,
  );
}

export function getSuperPdpDirectoryEntries(siren: string) {
  return apiClient<{ data: SuperPdpDirectoryEntry[] }>(
    `api/electronic-invoicing/superpdp/directory/companies/${encodeURIComponent(siren)}/entries`,
  );
}

export type SuperPdpB2bTransmission = {
  id: string;
  providerInvoiceId?: string | null;
  status: string;
  providerStatus?: string | null;
  submittedAt?: string | null;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  events?: Array<{ id: string; providerStatus: string; occurredAt: string }>;
};

export function sendB2BInvoiceToSuperPdp(companyId: string, documentId: string) {
  return apiClient<SuperPdpB2bTransmission>(
    `api/electronic-invoicing/superpdp/companies/${companyId}/documents/${documentId}/b2b/send`,
    { method: 'POST' },
  );
}

export function syncB2BInvoiceWithSuperPdp(companyId: string, documentId: string) {
  return apiClient<SuperPdpB2bTransmission>(
    `api/electronic-invoicing/superpdp/companies/${companyId}/documents/${documentId}/b2b/sync`,
    { method: 'POST' },
  );
}

export type InstalmentRetryCapability = {
  canRetryManually: boolean;
  automaticRetryScheduled: boolean;
  mandateActionRequired: boolean;
  nextChargeDate?: string;
  message: string;
};

export async function getInstalmentRetryCapability(
  documentId: string,
  instalmentNumber: number,
) {
  return apiClient<InstalmentRetryCapability>(
    `api/documents/${documentId}/instalments/${instalmentNumber}/retry-capability`,
  );
}

export async function retryInstalmentPayment(
  documentId: string,
  instalmentNumber: number,
) {
  return apiClient<InstalmentRetryCapability>(
    `api/documents/${documentId}/instalments/${instalmentNumber}/retry`,
    { method: 'POST' },
  );
}

export async function resendInstalmentMandateAuthorisation(documentId: string) {
  return apiClient<{ success: true; message: string }>(
    `api/documents/${documentId}/resend-instalment-mandate-authorisation`,
    { method: 'POST' },
  );
}

export async function markInvoiceAsPaidManually(documentId: string) {
  return apiClient<{ success: true; message: string }>(
    `api/documents/${documentId}/mark-as-paid-manually`,
    {
      method: "PUT",
    },
  );
}

export async function markInvoiceAsPendingManually(documentId: string) {
  return apiClient<{ success: true; message: string }>(
    `api/documents/${documentId}/mark-as-pending-manually`,
    {
      method: "PUT",
    },
  );
}

export async function downloadDocumentPdf(documentId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/documents/${documentId}/download-pdf`,
    { credentials: "include" },
  );

  if (!response.ok) {
    throw new Error("Impossible de télécharger le document.");
  }

  return response.blob();
}

export async function downloadFacturX(documentId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/electronic-invoicing/factur-x/documents/${documentId}/download`,
    { credentials: 'include' },
  );
  if (!response.ok) {
    let message = 'Impossible de générer le Factur-X.';
    try {
      const body = await response.json() as { message?: string | string[] };
      message = Array.isArray(body.message) ? body.message.join(', ') : body.message ?? message;
    } catch { /* The API can return a non-JSON error page. */ }
    throw new Error(message);
  }
  return response.blob();
}

export async function getDocumentNegociations(documentId: string) {
  return apiClient<DocumentNegociation[]>(
    `api/documents/${documentId}/negociations`,
    {
      method: "GET",
    },
  );
}

export async function getDocumentVersions(documentId: string) {
  return apiClient<DocumentVersion[]>(`api/documents/${documentId}/versions`, {
    method: "GET",
  });
}

export async function createNewDocumentVersion(documentId: string) {
  return apiClient<{ document: Document }>(
    `api/documents/${documentId}/create-version`,
    {
      method: "POST",
    },
  );
}

export async function convertEstimateToInvoice(estimateId: string) {
  return apiClient<{ document: Document }>(
    `api/documents/${estimateId}/turn-into-invoice`,
    {
      method: "POST",
    },
  );
}
