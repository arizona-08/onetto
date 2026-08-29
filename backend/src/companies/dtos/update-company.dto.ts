import { IsBIC, IsBoolean, IsEmail, IsIBAN, IsIn, IsOptional, IsPhoneNumber, IsString } from "class-validator";
import type { CompanyElectronicAddressScheme, CompanyLegalStatus, CompanyVatRegime } from '@prisma/client';

export class UpdateCompanyDto {
  // Ces champs sont renvoyés par l'API et peuvent être présents dans un formulaire prérempli.
  // Ils sont acceptés, mais ne sont jamais utilisés pour modifier l'identité ou le propriétaire.
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber("FR")
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  siren?: string;

  @IsOptional()
  @IsString()
  siret?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBoolean()
  subjectToVat?: boolean;

  @IsOptional()
  @IsIn(['MICRO_ENTERPRISE', 'INDIVIDUAL_ENTREPRENEUR', 'EIRL', 'EURL', 'SARL', 'SELARL', 'SASU', 'SAS', 'SELAS', 'SA', 'SELAFA', 'SCA', 'SELCA', 'SNC', 'SCS', 'SLP', 'SOCIETE_CIVILE', 'SCI', 'SCM', 'SCP', 'EARL', 'GAEC', 'SCEA', 'GIE', 'ASSOCIATION', 'FONDATION', 'MUTUELLE', 'COOPERATIVE', 'ETABLISSEMENT_PUBLIC', 'COLLECTIVITE_TERRITORIALE', 'SOCIETE_ETRANGERE', 'OTHER'])
  legalStatus?: CompanyLegalStatus;

  @IsOptional()
  @IsIn(['MONTHLY', 'QUARTERLY', 'SIMPLIFIED', 'VAT_EXEMPTION'])
  vatRegime?: CompanyVatRegime;

  @IsOptional()
  @IsBoolean()
  isVatExempt?: boolean;

  @IsOptional()
  @IsBoolean()
  hasVatOnDebits?: boolean;

  @IsOptional()
  @IsString()
  electronicAddress?: string;

  @IsOptional()
  @IsIn(['SIREN', 'SIRET', 'VAT', 'GLN', 'PEPPOL'])
  electronicAddressScheme?: CompanyElectronicAddressScheme;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsIBAN()
  IBAN?: string;

  @IsOptional()
  @IsBIC()
  BIC?: string;
}
