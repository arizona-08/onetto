import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsOptional,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { InstalmentsDetailsDto } from './create-document.dto';

export class SendDocumentToClientDto {
  @IsOptional()
  @IsIn(['ONE_TIME', 'INSTALMENTS'])
  paymentMode?: 'ONE_TIME' | 'INSTALMENTS';

  @ValidateIf((dto: SendDocumentToClientDto) => dto.paymentMode === 'INSTALMENTS')
  @IsDefined()
  @ValidateNested()
  @Type(() => InstalmentsDetailsDto)
  instalmentsDetails?: InstalmentsDetailsDto;
}
