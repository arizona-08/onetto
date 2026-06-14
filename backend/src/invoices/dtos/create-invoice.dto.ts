import { IsDate, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  clientName: string;

  @IsString()
  @IsNotEmpty()
  clientEmail: string

  @IsString()
  @IsNotEmpty()
  clientAddress: string

  @IsString()
  @IsNotEmpty()
  clientCity: string

  @IsString()
  @IsNotEmpty()
  clientPostalCode: string

  @IsString()
  @IsNotEmpty()
  clientCountry: string

  @IsNumber()
  @IsNotEmpty()
  totalPrice: number;

  urlDocumentPdf?: string;

  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  @IsDate()
  @IsNotEmpty()
  paymentDueAt: Date;

  @IsNotEmpty()
  services: InvoiceServiceDto[];

}

export type InvoiceServiceDto = {
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  vat?: number;
  wtPrice: number;
  totalPrice: number; 
}