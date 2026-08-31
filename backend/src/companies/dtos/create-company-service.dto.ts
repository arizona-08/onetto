import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCompanyServiceDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsString()
  unit: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsString()
  category: string;

  @IsOptional()
  @IsIn(['GOODS', 'SERVICES'])
  itemType?: 'GOODS' | 'SERVICES';
}
