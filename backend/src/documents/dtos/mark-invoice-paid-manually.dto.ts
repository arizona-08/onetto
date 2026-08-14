import { PaymentMethod } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class MarkInvoicePaidManuallyDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
