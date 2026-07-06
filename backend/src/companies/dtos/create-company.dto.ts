import { IsBIC, IsBoolean, IsDefined, IsEmail, IsIBAN, IsPhoneNumber, IsString } from "class-validator";

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

  @IsString()
  vatNumber?: string;

  @IsDefined()
  @IsIBAN()
  IBAN: string;

  @IsDefined()
  @IsBIC()
  BIC: string;
}