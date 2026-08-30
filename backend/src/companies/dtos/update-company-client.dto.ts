import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateCompanyClientDto {
  @IsOptional()
  @IsIn(['BUSINESS', 'CLIENT'])
  clientType?: 'BUSINESS' | 'CLIENT';
  @IsOptional() @IsString() siren?: string;
  @IsOptional() @IsString() vatNumber?: string;
  @IsOptional() @IsString() electronicAddress?: string;
  @IsOptional() @IsString() electronicAddressScheme?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

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
}
