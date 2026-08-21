import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsDefined,
  IsIn,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class DocumentClientDto {
  @IsDefined()
  @IsString()
  name: string;

  @IsDefined()
  @IsString()
  email: string;

  @IsDefined()
  @IsString()
  address: string;

  @IsDefined()
  @IsString()
  city: string;

  @IsDefined()
  @IsNumberString()
  postalCode: string;

  @IsDefined()
  @IsString()
  country: string;
}

export class LineItemsDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsDefined()
  @IsString()
  description: string;

  @IsDefined()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsDefined()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsDefined()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsDefined()
  @IsString()
  unit: string;
}

export class DocumentDateDto {
  @IsDefined()
  @IsDateString()
  dueDate: string;
}

export class InstalmentsDetailsDto {
  @IsDefined()
  @IsIn(['WEEKLY', 'MONTHLY', 'YEARLY'])
  frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY';

  @IsDefined()
  @IsNumber()
  @IsIn([2, 3])
  numberOfInstalments: 2 | 3;

  @IsDefined()
  @IsNumber()
  @Min(1)
  amountPerInstalmentInCents: number;
}

export class CreateDocumentDto {
  @IsOptional()
  @IsIn(['ESTIMATE', 'INVOICE'])
  type?: 'ESTIMATE' | 'INVOICE';

  @IsDefined()
  @ValidateNested()
  @Type(() => DocumentClientDto)
  client: DocumentClientDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemsDto)
  lineItems: LineItemsDto[];

  @IsDefined()
  @ValidateNested()
  @Type(() => DocumentDateDto)
  documentDates: DocumentDateDto;

  @IsOptional()
  @IsIn(['ONE_TIME', 'INSTALMENTS'])
  paymentMode?: 'ONE_TIME' | 'INSTALMENTS';

  @ValidateIf((dto: CreateDocumentDto) => dto.paymentMode === 'INSTALMENTS')
  @IsDefined()
  @ValidateNested()
  @Type(() => InstalmentsDetailsDto)
  instalmentsDetails?: InstalmentsDetailsDto;
}
