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
  ValidateNested,
} from 'class-validator';

export class DocumentClientDto {
  @IsOptional()
  @IsIn(['BUSINESS', 'CLIENT'])
  clientType?: 'BUSINESS' | 'CLIENT';

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
  @IsNumber()
  @IsIn([2, 3])
  numberOfInstalments: 2 | 3;

  @IsDefined()
  @IsDateString()
  firstDueDate: string;
}

export class CreateDocumentDto {
  @IsOptional()
  @IsIn(['ESTIMATE', 'INVOICE'])
  type?: 'ESTIMATE' | 'INVOICE';

  @IsOptional()
  @IsIn(['GOODS', 'SERVICES', 'MIXED'])
  operationNature?: 'GOODS' | 'SERVICES' | 'MIXED';

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
  @ValidateNested()
  @Type(() => InstalmentsDetailsDto)
  instalmentsDetails?: InstalmentsDetailsDto;

}
