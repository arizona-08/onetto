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
  rcs: string;
}

export type Company = CreateCompanyDto & {
  id: string;
  ownerId: string;
  status: 'ACTIVE' | 'CLOSED';
  isHidden: boolean;
  closingReason?: string | null;
  closedAt?: string | null;
  isPaymentAccountConnected: boolean;
  companyPaymentAccount?: {
    id: string;
    provider: 'GO_CARDLESS' | 'STRIPE' | 'PAYPAL';
    providerAccountId: string;
    // accessToken: string;
    creditorId: string;
    verificationStatus: 'NOT_VERIFIED' | 'VERIFIED' | 'IN_REVIEW';
  } | null;
}
