import { apiClient } from './api';

export type ArchiveItem = { id: string; kind: 'ISSUED_FACTUR_X' | 'SUPPLIER_ORIGINAL'; name: string | null; number: string | null; sha256: string | null; archivedAt: string | null };
export const getArchives = (companyId: string, query = '') => apiClient<ArchiveItem[]>(`api/archives?companyId=${encodeURIComponent(companyId)}&q=${encodeURIComponent(query)}`);
