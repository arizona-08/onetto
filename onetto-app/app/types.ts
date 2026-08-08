export type Client = {
  id: string;
  name: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export type Service = {
  id: string
  name: string
  description?: string
  unitPrice: number
  unit: string
  taxRate: number
  category: string
}

export type ServiceLineItem = {
  description: string
  quantity: number
  taxRate: number
  unitPrice: number
  unit: string
}

export type DocumentDates = {
  dueDate: string
}



export type Document = {
  id: string;
  documentNumber: string;
  type: "INVOICE" | "ESTIMATE";
  sourceDocumentId?: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  clientCountry: string;
  clientPostalCode: string;
  totalPrice: number;
  authorId: string;
  createdAt: string;
  paymentDueAt: string;
  invoiceStatus: InvoiceStatus;
  estimateStatus: EstimateStatus;
  services?: DocumentService[]
  urlDocumentPdf?: string;
  author: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
  }
  isChecked?: boolean;
}

export type InvoiceStatus = "DRAFT" | "PENDING" | "PAID" | "OVERDUE";
export type EstimateStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";


export type DocumentService = {
  id: string;
  documentId: string;
  description: string;
  quantity: number;
  taxRate: number;
  unitPrice: number;
  unit: string;
  wtPrice: number;
  totalPrice: number;
}
