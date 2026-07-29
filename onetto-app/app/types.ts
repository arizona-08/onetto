export type Client = {
  id: string;
  name: string;
  email: string;
  street: string;
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

export type InvoiceDates = {
  creationDate: string,
  dueDate: string
}

export type Estimate = Omit<Invoice, 'invoiceStatus'> & {
  estimateStatus: EstimateStatus
}

export type EstimateStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";

export type Invoice = {
  id: string;
  invoiceNumber: string;
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
  services?: InvoiceService[]
  urlDocumentPdf?: string;
  author: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
  }
}

export type InvoiceStatus = "DRAFT" | "PENDING" | "PAID" | "OVERDUE";


export type InvoiceService = {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  taxRate: number;
  unitPrice: number;
  unit: string;
  wtPrice: number;
  totalPrice: number;
}