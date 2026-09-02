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
  legalStatus: CompanyLegalStatus;
  vatRegime: CompanyVatRegime;
  isVatExempt: boolean;
  vatExigibility: CompanyVatExigibility;
  electronicAddress: string;
  electronicAddressScheme: 'SIREN' | 'SIRET' | 'VAT' | 'GLN' | 'PEPPOL';
  vatNumber?: string;
  IBAN: string;
  BIC: string;
}

export type CompanyLegalStatus =
  | 'MICRO_ENTERPRISE' | 'INDIVIDUAL_ENTREPRENEUR' | 'EIRL' | 'EURL'
  | 'SARL' | 'SELARL' | 'SASU' | 'SAS' | 'SELAS' | 'SA' | 'SELAFA'
  | 'SCA' | 'SELCA' | 'SNC' | 'SCS' | 'SLP' | 'SOCIETE_CIVILE' | 'SCI'
  | 'SCM' | 'SCP' | 'EARL' | 'GAEC' | 'SCEA' | 'GIE' | 'ASSOCIATION'
  | 'FONDATION' | 'MUTUELLE' | 'COOPERATIVE' | 'ETABLISSEMENT_PUBLIC'
  | 'COLLECTIVITE_TERRITORIALE' | 'SOCIETE_ETRANGERE' | 'OTHER';

export type CompanyVatRegime =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SIMPLIFIED'
  | 'VAT_EXEMPTION';

export type CompanyVatExigibility = 'UNKNOWN' | 'ON_COLLECTION' | 'ON_DEBITS';

export type Company = CreateCompanyDto & {
  id: string;
  ownerId: string;
  status: 'ACTIVE' | 'CLOSED';
  isHidden: boolean;
  closingReason?: string | null;
  closedAt?: string | null;
  isPaymentAccountConnected: boolean;
  /** True when GoCardless or SuperPDP needs setup, reconnection, or verification. */
  hasRequiredAction?: boolean;
  companyPaymentAccount?: {
    id: string;
    provider: 'GO_CARDLESS' | 'STRIPE' | 'PAYPAL';
    providerAccountId: string;
    // accessToken: string;
    creditorId: string;
    verificationStatus: 'NOT_VERIFIED' | 'VERIFIED' | 'IN_REVIEW';
  } | null;
}
