import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common';
import { IsIn, IsString, MaxLength } from 'class-validator';
import { DocumentService } from './document.service';

class UpdateNegociationMessageDto {
  @IsString()
  @MaxLength(5000)
  message: string;
}

class NegociationDecisionDto {
  @IsIn(['ACCEPTED', 'REJECTED'])
  status: 'ACCEPTED' | 'REJECTED';
}

@Controller('api/negociations')
export class NegociationController {
  constructor(private readonly documentService: DocumentService) {}

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
