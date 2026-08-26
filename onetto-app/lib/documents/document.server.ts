import { Document, PublicNegociation, PublicPayment } from "@/app/types";
import { apiServer } from "../api-server";

type EstimatesAndInvoicesType = {
  estimates: Document[];
  invoices: Document[];
}

export type PaginatedDocuments = {
  documents: Document[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type InvoiceStats = {
  paid: InvoiceStat;
  pending: InvoiceStat;
  overdue: InvoiceStat;
  draft: InvoiceStat;
};

export type DashboardSummary = {
  billedAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  pendingInvoicesCount: number;
  overdueInvoicesCount: number;
  pendingEstimatesCount: number;
  recentInvoices: Array<{
    id: string;
    documentNumber: string | null;
    totalPrice: number;
    invoiceStatus: string;
    createdAt: string;
  }>;
  pendingEstimates: Array<{
    id: string;
    documentNumber: string | null;
    totalPrice: number;
    createdAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'INVOICE' | 'ESTIMATE';
    documentNumber: string | null;
    invoiceStatus: string;
    estimateStatus: string;
    createdAt: string;
  }>;
  starter: {
    revenueByMonth: Array<{ label: string; amount: number }>;
    commercialPerformance: {
      sent: number;
      accepted: number;
      negotiating: number;
      rejected: number;
      acceptanceRate: number;
    };
    reminders: Array<{
      id: string;
      documentNumber: string | null;
      invoiceStatus: string;
      paymentDueAt: string;
    }>;
  };
};

export function getDashboardSummaryServer() {
  return apiServer<DashboardSummary>('api/documents/dashboard-summary');
}

export type ProDashboard = {
  revenueByMonth: Array<{ label: string; billed: number; collected: number }>;
  cashflowForecast: Array<{ month: string; amount: number }>;
  paymentDistribution: { payByBankPercent: number; instalmentsPercent: number; twoInstalments: number; threePlusInstalments: number };
  performance: { acceptanceRate: number; invoiceConversionRate: number; averageInvoiceAmount: number };
  payments: { averageDelayDays: number | null; upcomingInstalments: number; overdueInstalments: number };
  topClients: Array<{ name: string; amount: number }>;
  alerts: { overdueInvoices: number; overdueInstalments: number; unansweredEstimates: number };
};

export function getProDashboardServer() {
  return apiServer<ProDashboard>('api/documents/dashboard-pro');
}

type InvoiceStat = {
  count: number;
  totalAmount: number;
};

export async function getMyDocumentsServer(withServices: boolean = true) {
  return apiServer<EstimatesAndInvoicesType>(`api/documents/mines?with-services=${withServices}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  });
}

export async function getDocumentsPageServer(type: 'INVOICE' | 'ESTIMATE', page = 1, status?: string) {
  const statusQuery = status ? `&status=${encodeURIComponent(status)}` : '';
  return apiServer<PaginatedDocuments>(`api/documents/mines?with-services=false&type=${type}&page=${page}&pageSize=5${statusQuery}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getInvoiceStatsServer() {
  return apiServer<InvoiceStats>('api/documents/invoice-stats', {
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

export async function getPublicPaymentServer(token: string) {
  return apiServer<PublicPayment>(`api/public/payments?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    cache: 'no-store',
  });
}
