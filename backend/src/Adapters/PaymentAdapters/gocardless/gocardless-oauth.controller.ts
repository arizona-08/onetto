import { Controller, Get, Query, Res } from "@nestjs/common";
import { GoCardlessOAuthService } from "./gocardless-oauth.service";
import type { Response } from "express";

@Controller('api/gocardless/oauth')
export class GoCardlessOAuthController {
  constructor(
    private readonly gocardlessOAuthService: GoCardlessOAuthService
  ) {}

  @Get('authorize')
  async authorize(@Query('email') email: string, @Query('companyId') companyId: string) {
    return await this.gocardlessOAuthService.buildAuthorizationUrl({email, companyId});
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    await this.gocardlessOAuthService.connectCompanyWithGoCardless(code, state);
    return res.redirect(`http://localhost:3000/my-companies/${state}`);
  }
}