import { Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { SuperPdpEreportingService } from './superpdp-ereporting.service';

@UseGuards(AuthGuard)
@Controller('api/electronic-invoicing/superpdp')
export class SuperPdpEreportingController {
  constructor(private readonly ereporting: SuperPdpEreportingService) {}

  @Post('companies/:companyId/documents/:documentId/b2c-transaction')
  submitB2CTransaction(@Param('companyId') companyId: string, @Param('documentId') documentId: string, @Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    return this.ereporting.submitB2CTransaction({ companyId, documentId, userId: req.user.id });
  }

  @Get('companies/:companyId/ereporting-overview')
  getOverview(@Param('companyId') companyId: string, @Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    return this.ereporting.getOverview({ companyId, userId: req.user.id });
  }
}
