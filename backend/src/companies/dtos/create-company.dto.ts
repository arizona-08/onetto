import { IsBIC, IsBoolean, IsDefined, IsEmail, IsIBAN, IsIn, IsPhoneNumber, IsString } from "class-validator";

const legalStatuses = [
  'MICRO_ENTERPRISE', 'INDIVIDUAL_ENTREPRENEUR', 'EIRL', 'EURL', 'SARL',
  'SELARL', 'SASU', 'SAS', 'SELAS', 'SA', 'SELAFA', 'SCA', 'SELCA', 'SNC',
  'SCS', 'SLP', 'SOCIETE_CIVILE', 'SCI', 'SCM', 'SCP', 'EARL', 'GAEC',
  'SCEA', 'GIE', 'ASSOCIATION', 'FONDATION', 'MUTUELLE', 'COOPERATIVE',
  'ETABLISSEMENT_PUBLIC', 'COLLECTIVITE_TERRITORIALE', 'SOCIETE_ETRANGERE',
  'OTHER',
] as const;

export class CreateCompanyDto {
  @IsDefined()
  @IsString()
  name: string;

  @IsDefined()
  @IsEmail()
  email: string;
  
  @IsDefined()
  @IsPhoneNumber("FR")
  phoneNumber: string;

  @IsDefined()
  @IsString()
  siren: string;

  @IsDefined()
  @IsString()
  siret: string;

  @IsDefined()
  @IsString()
  address: string;

  @IsDefined()
  @IsString()
  city: string;

  @IsDefined()
  @IsString()
  postalCode: string;

  @IsDefined()
  @IsString()
  country: string;

  @IsDefined()
  @IsBoolean()
  subjectToVat: boolean;

  @IsDefined()
  @IsIn(legalStatuses)
  legalStatus: (typeof legalStatuses)[number];

  @IsDefined()
  @IsIn(['MONTHLY', 'QUARTERLY', 'SIMPLIFIED', 'VAT_EXEMPTION'])
  vatRegime: 'MONTHLY' | 'QUARTERLY' | 'SIMPLIFIED' | 'VAT_EXEMPTION';

  @IsDefined()
  @IsBoolean()
  isVatExempt: boolean;

  @IsDefined()
  @IsIn(['UNKNOWN', 'ON_COLLECTION', 'ON_DEBITS'])
  vatExigibility: 'UNKNOWN' | 'ON_COLLECTION' | 'ON_DEBITS';

  @IsDefined()
  @IsString()
  electronicAddress: string;

  @IsDefined()
  @IsIn(['SIREN', 'SIRET', 'VAT', 'GLN', 'PEPPOL'])
  electronicAddressScheme: 'SIREN' | 'SIRET' | 'VAT' | 'GLN' | 'PEPPOL';

  @IsString()
  vatNumber?: string;

  @IsDefined()
  @IsIBAN()
  IBAN: string;

  @IsDefined()
  @IsBIC()
  BIC: string;
}
