import { ApiError, apiClient, buildApiUrl, parseJsonResponse, toApiError } from '@/lib/api';
import { err, ok, Result } from '@/shared/result';

export type AppNotification = { id: string; type: string; title: string; message: string; href: string | null; readAt: string | null; createdAt: string };
export const getNotifications = () => apiClient<AppNotification[]>('api/notifications');
export const markNotificationRead = (id: string) => apiClient(`api/notifications/${id}/read`, { method: 'PUT' });
export type SupplierInvoice = { id: string; supplierName: string | null; invoiceNumber: string | null; issuedAt: string | null; dueAt: string | null; currencyCode: string; totalIncludingTax: number; status: string; receivedAt: string };
export const getSupplierInvoices = (companyId: string) => apiClient<SupplierInvoice[]>(`api/electronic-invoicing/superpdp/companies/${companyId}/incoming-invoices`);
export const synchronizeSupplierInvoices = (companyId: string) => apiClient<{ success: true }>(`api/electronic-invoicing/superpdp/companies/${companyId}/incoming-invoices/synchronize`, { method: 'POST' });

export async function downloadSupplierInvoice(companyId: string, invoiceId: string): Promise<Result<void, ApiError>> {
  try {
    const response = await fetch(buildApiUrl(process.env.NEXT_PUBLIC_API_URL, `api/electronic-invoicing/superpdp/companies/${companyId}/incoming-invoices/${invoiceId}/download`), {
      credentials: 'include',
    });
    if (!response.ok) {
      return err(toApiError(await parseJsonResponse(response), response.status));
    }

    const downloadUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = downloadUrl;
    const fileName = response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/)?.[1];
    link.download = fileName ?? 'facture-fournisseur';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
    return ok(undefined);
  } catch (error) {
    return err({
      statusCode: 0,
      message: 'Impossible de télécharger la facture fournisseur.',
      error: error instanceof Error ? error.message : undefined,
    });
  }
}
