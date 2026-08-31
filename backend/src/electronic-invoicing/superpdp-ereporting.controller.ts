import { Controller, Get, Param, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { SuperPdpEreportingService } from './superpdp-ereporting.service';

@UseGuards(AuthGuard)
@Controller('api/electronic-invoicing/superpdp')
export class SuperPdpEreportingController {
  constructor(private readonly ereporting: SuperPdpEreportingService) {}

  @Get('companies/:companyId/ereporting-overview')
  getOverview(@Param('companyId') companyId: string, @Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    return this.ereporting.getOverview({ companyId, userId: req.user.id });
  }
}
