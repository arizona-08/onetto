import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { SuperPdpOAuthService } from './superpdp-oauth.service';

@Controller('api/electronic-invoicing/superpdp/oauth')
export class SuperPdpOAuthController {
  constructor(private readonly superPdpOAuthService: SuperPdpOAuthService) {}

  @UseGuards(AuthGuard)
  @Get('companies/:companyId/authorize')
  async authorize(
    @Param('companyId') companyId: string,
    @Req() req: ExtendedRequest,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Non authentifié');
    }
    return this.superPdpOAuthService.buildAuthorizationUrl({
      companyId,
      userId: req.user.id,
    });
  }

  @UseGuards(AuthGuard)
  @Get('companies/:companyId/status')
  async status(
    @Param('companyId') companyId: string,
    @Req() req: ExtendedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    return this.superPdpOAuthService.getConnectionStatus({
      companyId,
      userId: req.user.id,
    });
  }

  @UseGuards(AuthGuard)
  @Get('companies/:companyId/verify')
  async verify(
    @Param('companyId') companyId: string,
    @Req() req: ExtendedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    return this.superPdpOAuthService.verifyConnection({
      companyId,
      userId: req.user.id,
    });
  }

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const { companyId } = await this.superPdpOAuthService.completeAuthorization({
      code,
      state,
      error,
    });
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/my-companies?superpdp=connected&companyId=${companyId}`);
  }
}
