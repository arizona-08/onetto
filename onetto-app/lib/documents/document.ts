import { Document } from "@/app/types";
import { apiClient } from "../api";
import { CreateDocumentDto } from "./dtos/create-document.dto";
import { CreateDocumentResponse } from "./responses/create-document.response";

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

export async function updateDraftDocument(documentId: string, data: CreateDocumentDto) {
  return apiClient<CreateDocumentResponse>(`api/documents/${documentId}/update-draft`, {
    method: "PUT",
    body: JSON.stringify(data)
  })
}