import { Type } from "class-transformer";
import { IsArray, IsDate, IsDateString, IsDefined, IsNotEmpty, IsNumber, IsNumberString, IsString, Min, ValidateNested } from "class-validator";


export class DocumentClientDto {
  @IsDefined()
  @IsString()
  name: string;

  @IsDefined()
  @IsString()
  email: string

  @IsDefined()
  @IsString()
  street: string;

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
  creationDate: string;

  @IsDefined()
  @IsDateString()
  dueDate: string;
}

export class CreateDocumentDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => DocumentClientDto)
  client: DocumentClientDto;

  @IsArray()
  @ValidateNested({each: true})
  @Type(() => LineItemsDto)
  lineItems: LineItemsDto[];

  @IsDefined()
  @ValidateNested()
  @Type(() => DocumentDateDto)
  documentDates: DocumentDateDto;
}

