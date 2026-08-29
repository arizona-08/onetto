import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateCompanyClientDto {
  @IsOptional()
  @IsIn(['BUSINESS', 'CLIENT'])
  clientType?: 'BUSINESS' | 'CLIENT';

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  postalCode: string;

  @IsString()
  country: string;
}
