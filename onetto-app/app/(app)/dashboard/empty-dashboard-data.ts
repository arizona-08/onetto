import type {
  DashboardSummary,
  ProDashboard,
} from "@/lib/documents/document.server";

export function emptyDashboardSummary(): DashboardSummary {
  return {
    billedAmount: 0,
    collectedAmount: 0,
    outstandingAmount: 0,
    pendingInvoicesCount: 0,
    overdueInvoicesCount: 0,
    pendingEstimatesCount: 0,
    recentInvoices: [],
    pendingEstimates: [],
    recentActivity: [],
    starter: {
      revenueByMonth: [],
      commercialPerformance: {
        sent: 0,
        accepted: 0,
        negotiating: 0,
        rejected: 0,
        acceptanceRate: 0,
      },
      reminders: [],
    },
  };
}

export function emptyProDashboard(): ProDashboard {
  return {
    revenueByMonth: [],
    cashflowForecast: [],
    paymentDistribution: {
      payByBankPercent: 0,
      instalmentsPercent: 0,
      twoInstalments: 0,
      threePlusInstalments: 0,
    },
    performance: {
      acceptanceRate: 0,
      invoiceConversionRate: 0,
      averageInvoiceAmount: 0,
    },
    payments: {
      averageDelayDays: null,
      upcomingInstalments: 0,
      overdueInstalments: 0,
    },
    topClients: [],
    alerts: {
      overdueInvoices: 0,
      overdueInstalments: 0,
      unansweredEstimates: 0,
    },
  };
}
