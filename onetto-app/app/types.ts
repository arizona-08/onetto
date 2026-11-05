export type Client = {
  id: string;
  name: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  clientType: "BUSINESS" | "CLIENT";
  siren?: string;
  vatNumber?: string;
  electronicAddress?: string;
  electronicAddressScheme?: string;
};

export type Service = {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  unit: string;
  taxRate: number;
  category: string;
  itemType: "GOODS" | "SERVICES";
};

export type ServiceLineItem = {
  description: string;
  quantity: number;
  taxRate: number;
  unitPrice: number;
  unit: string;
  itemType: "GOODS" | "SERVICES";
};

export type DocumentDates = {
  dueDate: string;
};

export type DepositPlanInput = {
  deposits: Array<{ percentage: number; triggerCondition: string }>;
  balanceCondition: string;
};

export type Document = {
  id: string;
  companyId: string;
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
  clientType?: "BUSINESS" | "INDIVIDUAL" | "PUBLIC_BODY" | "FOREIGN" | null;
  clientSiren?: string | null;
  clientVatNumber?: string | null;
  clientElectronicAddress?: string | null;
  clientElectronicAddressScheme?: string | null;
  operationNature?: "GOODS" | "SERVICES" | "MIXED" | null;
  totalPriceExcludingTax: number;
  totalPrice: number;
  authorId: string;
  createdAt: string;
  sentAt?: string | null;
  paymentDueAt: string;
  invoiceStatus: InvoiceStatus;
  estimateStatus: EstimateStatus;
  services?: DocumentService[];
  urlDocumentPdf?: string;
  author: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
  };
  isChecked?: boolean;
  isEditable?: boolean;
  invoicePaymentMode?: {
    paymentMode: "ONE_TIME" | "INSTALMENTS";
    numberOfInstalments: number | null;
    firstDueDate?: string | null;
  } | null;
  contractPaymentPlan?: {
    id: string;
    authorizationToken?: string;
    totalAmountInCents: number;
    acceptedAt?: string | null;
    cancelledAt?: string | null;
    mandateStatus: string;
    stages: Array<{
      id: string;
      sequence: number;
      kind: "DEPOSIT" | "BALANCE";
      percentage: number;
      amountInCents: number;
      triggerCondition: string;
      invoiceId?: string | null;
      invoice?: {
        id: string;
        documentNumber: string | null;
        invoiceStatus: string;
        totalPrice: number;
      } | null;
      payment?: {
        status: string;
        providerPaymentId: string | null;
        chargeDate: string | null;
        failureReason: string | null;
        automaticRetryScheduled?: boolean;
        manualRetryRequestedAt?: string | null;
        manualSettlementAt?: string | null;
        needsAccountingReview?: boolean;
      } | null;
    }>;
  } | null;
  contractStageInvoice?: {
    kind: "DEPOSIT" | "BALANCE";
    sequence: number;
    percentage: number;
    plan?: { stages: Array<{ kind: "DEPOSIT" | "BALANCE" }> };
  } | null;
  invoicePaymentLinks?: Array<{ provider: "GOCARDLESS" | "BRIDGE" }>;
  invoiceInstalmentPlan?: {
    startDate: string;
    numberOfInstalments: number;
    invoicePaymentInstalments: Array<{
      instalmentNumber: number;
      amountInCents: number;
      dueDate: string;
      instalmentStatus:
        | "PENDING"
        | "PAYMENT_IN_PROGRESS"
        | "SUCCESS"
        | "FAILED"
        | "OVERDUE";
      paidAt?: string | null;
    }>;
  } | null;
  electronicInvoiceTransmissions?: Array<{
    status: string;
    providerStatus?: string | null;
    providerInvoiceId?: string | null;
    submittedAt?: string | null;
    lastSyncedAt?: string | null;
    lastError?: string | null;
  }>;
};

export type InvoiceStatus =
  | "DRAFT"
  | "PENDING"
  | "PAYMENT_IN_PROGRESS"
  | "PAID"
  | "PAID_MANUALLY"
  | "OVERDUE"
  | "REJECTED"; // rejected payment by Bridge API, can ask to recreate another paymentLink
export type EstimateStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "SUPERSEDED"
  | "REJECTED";

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
  itemType: "GOODS" | "SERVICES";
};

export type PublicPayment = {
  paymentLink: string | null;
  paymentMessage?: string;
  expiresAt: string;
  document: Pick<
    Document,
    | "documentNumber"
    | "clientName"
    | "totalPrice"
    | "totalPriceExcludingTax"
    | "paymentDueAt"
    | "services"
    | "invoicePaymentMode"
    | "invoiceInstalmentPlan"
  > & {
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
  canNegotiate: boolean;
  proposedPaymentStages?: Array<{
    sequence: number;
    kind: "DEPOSIT" | "BALANCE";
    percentage: number;
    amountInCents: number;
    triggerCondition: string;
  }> | null;
  document: Pick<
    Document,
    | "id"
    | "documentNumber"
    | "type"
    | "clientName"
    | "clientEmail"
    | "clientAddress"
    | "clientCity"
    | "clientPostalCode"
    | "clientCountry"
    | "totalPrice"
    | "createdAt"
    | "sentAt"
    | "paymentDueAt"
    | "contractPaymentPlan"
  > & {
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
