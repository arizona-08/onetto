import { apiClient } from '@/lib/api';

export type AppNotification = { id: string; type: string; title: string; message: string; href: string | null; readAt: string | null; createdAt: string };
export const getNotifications = () => apiClient<AppNotification[]>('api/notifications');
export const markNotificationRead = (id: string) => apiClient(`api/notifications/${id}/read`, { method: 'PUT' });
export type SupplierInvoice = { id: string; supplierName: string | null; invoiceNumber: string | null; issuedAt: string | null; dueAt: string | null; currencyCode: string; totalIncludingTax: number; status: string; receivedAt: string };
export const getSupplierInvoices = (companyId: string) => apiClient<SupplierInvoice[]>(`api/electronic-invoicing/superpdp/companies/${companyId}/incoming-invoices`);
export const synchronizeSupplierInvoices = (companyId: string) => apiClient<{ success: true }>(`api/electronic-invoicing/superpdp/companies/${companyId}/incoming-invoices/synchronize`, { method: 'POST' });
