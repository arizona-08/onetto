import { Body, Controller, Delete, Get, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { LoginDto } from "./dtos/login.dto";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import type { Request, Response } from "express";
import type { ExtendedRequest } from "src/types/extended-request.types";

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
  async me(@Req() req: ExtendedRequest){
    return req.user;
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response
  ){
    return await this.authService.refreshToken(req, response);
  }

  @Delete("logout")
  async logout(@Res({ passthrough: true }) response: Response){
    return await this.authService.logout(response);
  }
}
