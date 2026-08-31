import { Client, Service } from '@/app/types';
import { apiClient } from '@/lib/api';

function getServicePayload(service: Service) {
  return {
    name: service.name,
    description: service.description ?? '',
    unitPrice: service.unitPrice,
    unit: service.unit,
    taxRate: service.taxRate,
    category: service.category,
    itemType: service.itemType,
  };
}

function getClientPayload(client: Client) {
  return {
    name: client.name,
    email: client.email,
    address: client.address,
    city: client.city,
    postalCode: client.postalCode,
    country: client.country,
    clientType: client.clientType,
    siren: client.siren,
    vatNumber: client.vatNumber,
    electronicAddress: client.electronicAddress,
    electronicAddressScheme: client.electronicAddressScheme,
  };
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
  const data = getServicePayload(service);

  return apiClient<Service>('api/companies/active/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateActiveCompanyService(service: Service) {
  const data = getServicePayload(service);

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
  const data = getClientPayload(client);

  return apiClient<Client>('api/companies/active/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateActiveCompanyClient(client: Client) {
  const data = getClientPayload(client);

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
