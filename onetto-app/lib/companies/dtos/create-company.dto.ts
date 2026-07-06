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