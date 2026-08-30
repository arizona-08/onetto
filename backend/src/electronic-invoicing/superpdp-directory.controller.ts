import { Controller, Get, Param, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { SuperPdpDirectoryService } from './superpdp-directory.service';

@UseGuards(AuthGuard)
@Controller('api/electronic-invoicing/superpdp/directory')
export class SuperPdpDirectoryController {
  constructor(private readonly directory: SuperPdpDirectoryService) {}

  @Get('companies')
  searchCompanies(@Query('query') query: string, @Query('postcode') postcode: string | undefined, @Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    void postcode; // Reserved for the provider postcode filter when exposed in the UI.
    return this.directory.searchCompanies(query ?? '');
  }

  @Get('companies/:siren/entries')
  getEntries(@Param('siren') siren: string, @Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    return this.directory.getEntries(siren);
  }
}
