import { Client, Service } from '@/app/types';
import { apiClient } from '@/lib/api';

function withoutId<T extends { id: string }>(resource: T) {
  const { id, ...data } = resource;
  void id;

  return data;
}

export function getActiveCompanyClients() {
  return apiClient<Client[]>('api/companies/active/clients', {
    method: 'GET',
  });
}

export function getActiveCompanyServices() {
  return apiClient<Service[]>('api/companies/active/services', {
    method: 'GET',
  });
}

export function createActiveCompanyService(service: Service) {
  const data = withoutId(service);

  return apiClient<Service>('api/companies/active/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateActiveCompanyService(service: Service) {
  const data = withoutId(service);

  return apiClient<Service>(`api/companies/active/services/${service.id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteActiveCompanyService(serviceId: string) {
  return apiClient<{ success: boolean }>(`api/companies/active/services/${serviceId}`, {
    method: 'DELETE',
  });
}

export function createActiveCompanyClient(client: Client) {
  const data = withoutId(client);

  return apiClient<Client>('api/companies/active/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateActiveCompanyClient(client: Client) {
  const data = withoutId(client);

  return apiClient<Client>(`api/companies/active/clients/${client.id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteActiveCompanyClient(clientId: string) {
  return apiClient<{ success: boolean }>(`api/companies/active/clients/${clientId}`, {
    method: 'DELETE',
  });
}
