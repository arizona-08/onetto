import { Document } from "@/app/types";

export interface CreateDocumentResponse {
  success: boolean,
  message: string
  document?: Document
}
