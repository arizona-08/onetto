import { Type } from "class-transformer";
import { IsDefined, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

class WebhookTransactionContentDto {
  @IsOptional()
  @IsString()
  client_reference?: string;

  @IsString()
  payment_link_id: string;

  @IsOptional()
  @IsString()
  payment_link_status?: string;

  @IsOptional()
  @IsString()
  payment_link_reference?: string;

  @IsString()
  payment_request_id: string;

  @IsString()
  payment_transaction_id: string;

  @IsOptional()
  @IsString()
  status?: BridgeWebhookTransactionStatus;

  @IsOptional()
  @IsString()
  status_reason?: string
}

export type BridgeWebhookTransactionStatus = 'CREA' | 'ACTC' | 'PDNG' | 'ACSC' | 'RJCT';


type WebhookTransactionType = 'payment.transaction.created' | 'payment.transaction.updated' | 'payment.link.updated' | 'TEST_EVENT';

export class WebhookTransactionDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => WebhookTransactionContentDto)
  content: WebhookTransactionContentDto;

  @IsNumber()
  timestamp: number;

  @IsString()
  type: WebhookTransactionType;
}

