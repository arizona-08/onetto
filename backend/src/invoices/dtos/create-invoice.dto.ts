import { Type } from "class-transformer";
import { IsArray, IsDate, IsDefined, IsNotEmpty, IsNumber, IsString, ValidateNested } from "class-validator";


export class InvoiceClientDto {
  name: string;
  email: string
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export class LineItemsDto {
  description: string;
  quantity: number;
  taxRate?: number;
  unitPrice: number;
  unit: string;
  wtPrice: number;
  totalPrice: number; 
}

export class InvoiceDateDto {
  creationDate: string;
  dueDate: string;
}

export class CreateInvoiceDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => InvoiceClientDto)
  client: InvoiceClientDto;

  @IsArray()
  @ValidateNested({each: true})
  @Type(() => LineItemsDto)
  lineItems: LineItemsDto[];

  @IsDefined()
  @ValidateNested()
  @Type(() => InvoiceDateDto)
  invoiceDates: InvoiceDateDto;
}

