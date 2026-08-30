import { Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { SuperPdpB2bService } from './superpdp-b2b.service';

@UseGuards(AuthGuard)
@Controller('api/electronic-invoicing/superpdp/companies/:companyId/documents/:documentId/b2b')
export class SuperPdpB2bController {
  constructor(private readonly b2b: SuperPdpB2bService) {}

  @Post('send')
  send(@Param('companyId') companyId: string, @Param('documentId') documentId: string, @Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    return this.b2b.send({ companyId, documentId, user: req.user });
  }

  @Post('sync')
  sync(@Param('companyId') companyId: string, @Param('documentId') documentId: string, @Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    return this.b2b.sync({ companyId, documentId, user: req.user });
  }

  @Get()
  getTransmission(@Param('companyId') companyId: string, @Param('documentId') documentId: string, @Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    return this.b2b.getTransmission({ companyId, documentId, user: req.user });
  }
}
