export type CreateCompanyDto = {
  name: string;
  siren: string;
  siret: string;
  email: string;
  phoneNumber: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  subjectToVat: boolean;
  vatNumber?: string;
  IBAN: string;
  BIC: string;
}

export type Company = CreateCompanyDto & {
  id: string;
  ownerId: string;
  status: 'ACTIVE' | 'CLOSED';
  isHidden: boolean;
  closingReason?: string | null;
  closedAt?: string | null;
}
