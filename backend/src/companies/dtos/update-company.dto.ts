import { IsBIC, IsBoolean, IsEmail, IsIBAN, IsOptional, IsPhoneNumber, IsString } from "class-validator";

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
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsIBAN()
  IBAN?: string;

  @IsOptional()
  @IsBIC()
  BIC?: string;
}
