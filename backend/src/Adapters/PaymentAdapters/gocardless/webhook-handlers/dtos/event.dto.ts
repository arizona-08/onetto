import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class GoCardlessEventSourceDto {
  @IsString()
  type: string;
}

export class GoCardlessOrganisationDetailsDto {
  @IsString()
  name: string;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  nickname: string | null;
}

/** Payload d'un évènement envoyé par le webhook GoCardless. */
export class GoCardlessEventDto {
  @IsString()
  id: string;

  /** Date ISO 8601 telle qu'envoyée par GoCardless. */
  @IsDateString()
  created_at: string;

  @IsString()
  resource_type: string;

  @IsString()
  action: string;

  /**
   * Les propriétés de details dépendent de la ressource et de l'action.
   * Elles sont donc volontairement laissées ouvertes.
   */
  @IsObject()
  details: Record<string, unknown>;

  /** Les identifiants liés varient selon resource_type. */
  @IsObject()
  links: Record<string, string>;

  @IsObject()
  metadata: Record<string, string>;

  @IsObject()
  resource_metadata: Record<string, string>;

  @ValidateNested()
  @IsOptional()
  @Type(() => GoCardlessEventSourceDto)
  source?: GoCardlessEventSourceDto;

  @IsString()
  organisation_id: string;

  @ValidateNested()
  @IsOptional()
  @Type(() => GoCardlessOrganisationDetailsDto)
  organisation_details?: GoCardlessOrganisationDetailsDto;
}

export class GoCardlessWebhookDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoCardlessEventDto)
  events: GoCardlessEventDto[];

  @IsObject()
  @IsOptional()
  meta?: Record<string, string>;
}
