import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';

type DirectoryCompany = {
  number: string;
  formal_name: string;
  address: string;
  postcode: string;
  city: string;
  country: string;
};

@Injectable()
export class SuperPdpDirectoryService {
  private readonly baseUrl = 'https://api.superpdp.tech/v1.beta/french_directory';

  async searchCompanies(query: string) {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      throw new BadRequestException('Saisissez au moins deux caractères pour rechercher une entreprise.');
    }

    const url = new URL(`${this.baseUrl}/companies`);
    url.searchParams.set('limit', '20');
    if (/^\d{9}$/.test(normalizedQuery)) {
      url.searchParams.set('number', normalizedQuery);
    } else {
      url.searchParams.set('formal_name_starts_with', normalizedQuery);
    }

    return this.fetchJson<{ data: DirectoryCompany[]; has_more: boolean }>(url);
  }

  async getEntries(siren: string) {
    if (!/^\d{9}$/.test(siren)) {
      throw new BadRequestException('Le SIREN doit comporter 9 chiffres.');
    }
    const url = new URL(`${this.baseUrl}/entries`);
    url.searchParams.set('number', siren);
    return this.fetchJson<{
      data: Array<{ identifier: string; is_active: boolean; company: DirectoryCompany }>;
    }>(url);
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() as T;
    } catch {
      throw new BadGatewayException('L’annuaire SuperPDP est momentanément indisponible.');
    }
  }
}
