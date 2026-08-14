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
  versionNumber: number;
  isLastVersion: boolean;
  type: "INVOICE" | "ESTIMATE";
  isFromEstimate?: boolean | null;
  sourceDocumentId?: string;
  convertedDocuments?: Array<{ id: string }>;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  clientCountry: string;
  clientPostalCode: string;
  totalPrice: number;
  authorId: string;
  createdAt: string;
  sentAt?: string | null;
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
  isEditable?: boolean;
}

export type InvoiceStatus =
  | "DRAFT"
  | "PENDING"
  | "PAYMENT_IN_PROGRESS"
  | "PAID"
  | "PAID_MANUALLY"
  | "OVERDUE"
  | "REJECTED"; // rejected payment by Bridge API, can ask to recreate another paymentLink
export type EstimateStatus = "DRAFT" | "SENT" | "ACCEPTED" | "SUPERSEDED" | "REJECTED";


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

export type PublicPayment = {
  paymentLink: string;
  expiresAt: string;
  document: Pick<Document, 'documentNumber' | 'clientName' | 'totalPrice' | 'totalPriceExcludingTax' | 'paymentDueAt' | 'services'> & {
    company: {
      name: string;
      email: string;
      address: string;
      postalCode: string;
      city: string;
      country: string;
    };
  };
};

export type PublicNegociation = {
  id: string;
  message: string;
  proposedTotalPrice: number;
  status: "PENDING" | "ACCEPTED" | "RENEGOCIATED" | "REJECTED";
  document: Pick<Document, "id" | "documentNumber" | "type" | "clientName" | "clientEmail" | "clientAddress" | "clientCity" | "clientPostalCode" | "clientCountry" | "totalPrice" | "createdAt" | "sentAt" | "paymentDueAt"> & {
    totalPriceExcludingTax: number;
    services: DocumentService[];
    company: {
      name: string;
      email: string;
      phoneNumber: string;
      siren: string;
      address: string;
      postalCode: string;
      city: string;
      country: string;
      subjectToVat: boolean;
      vatNumber: string | null;
    };
  };
};

export type DocumentNegociation = {
  id: string;
  negociationToken: string;
  message: string;
  status: "PENDING" | "ACCEPTED" | "RENEGOCIATED" | "REJECTED";
  createdAt: string;
};

export type DocumentVersion = {
  id: string;
  versionNumber: number;
  estimateStatus: EstimateStatus;
  isEditable: boolean;
};
