import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { LoginDto } from "./dtos/login.dto";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import type { Request, Response } from "express";

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService
  ) {}

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response
  ){
    return await this.authService.login(body, response);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() req: any){
    return req.user;
  }

  @Post('refresh')
  async refresh(@Req() req: Request){
    return await this.authService.refreshToken(req);
  }

  async logout(@Res({ passthrough: true }) response: Response){
    return await this.authService.logout(response);
  }
}