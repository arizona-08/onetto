import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentService } from './document.service';
import { ContractPaymentService } from './contract-payment.service';
import { DepositStageDto } from './dtos/create-document.dto';

class UpdateNegociationMessageDto {
  @IsString()
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepositStageDto)
  proposedDeposits?: DepositStageDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  proposedBalanceCondition?: string;
}

class NegociationDecisionDto {
  @IsIn(['ACCEPTED', 'REJECTED'])
  status: 'ACCEPTED' | 'REJECTED';
}

@Controller('api/negociations')
export class NegociationController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly contracts: ContractPaymentService,
  ) {}

  @Post(':token/accept-with-mandate')
  async acceptWithMandate(@Param('token') token: string) {
    const authorizationToken = await this.documentService.startContractAcceptance(token);
    return this.contracts.getMandateAuthorisation(authorizationToken);
  }

  @Get(':token')
  async getByToken(@Param('token') token: string) {
    const negociation = await this.documentService.getNegociationByToken(token);

    if (!negociation) {
      throw new NotFoundException(
        "Cette négociation est introuvable ou n'est plus disponible.",
      );
    }

    return negociation;
  }

  @Put(':token/message')
  async updateMessage(
    @Param('token') token: string,
    @Body() body: UpdateNegociationMessageDto,
  ) {
    const negociation = await this.documentService.renegociateByToken(
      token,
      body.message,
      body.proposedDeposits,
      body.proposedBalanceCondition,
    );

    if (!negociation) {
      throw new NotFoundException(
        "Cette négociation est introuvable ou n'est plus disponible.",
      );
    }

    return negociation;
  }

  @Put(':token/status')
  async setStatus(
    @Param('token') token: string,
    @Body() body: NegociationDecisionDto,
  ) {
    const negociation = await this.documentService.setNegociationStatus(
      token,
      body.status,
    );

    if (!negociation) {
      throw new NotFoundException("Cette négociation n'est plus disponible.");
    }

    return negociation;
  }
}
