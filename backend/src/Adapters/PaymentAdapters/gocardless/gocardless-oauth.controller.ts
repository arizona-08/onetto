import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { GoCardlessOAuthService } from './gocardless-oauth.service';
import type { Response } from 'express';

@Controller('api/gocardless/oauth')
export class GoCardlessOAuthController {
  constructor(
    private readonly gocardlessOAuthService: GoCardlessOAuthService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('authorize')
  async authorize(
    @Query('email') email: string,
    @Query('companyId') companyId: string,
    @Req() req: ExtendedRequest,
  ) {
    return await this.gocardlessOAuthService.buildAuthorizationUrl({
      email,
      companyId,
      userId: req.user!.id,
    });
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const companyId =
      await this.gocardlessOAuthService.connectCompanyWithGoCardless(
        code,
        state,
      );
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/my-companies/${companyId}`);
  }

  @Get(':companyPaymentAccountId/verification-status')
  async verifyStatus(
    @Param('companyPaymentAccountId') companyPaymentAccountId: string,
    @Res() res: Response,
  ) {
    const { companyId, status } =
      await this.gocardlessOAuthService.verifyCompanyPaymentAccountStatus(
        companyPaymentAccountId,
      );
    if (status === 'NOT_VERIFIED') {
      return res.redirect(this.gocardlessOAuthService.getOnBoardingFlowUrl());
    }

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/my-companies/${companyId}`);
  }
}
