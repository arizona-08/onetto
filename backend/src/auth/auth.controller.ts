import { Body, Controller, Delete, Get, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { LoginDto } from "./dtos/login.dto";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import type { Request, Response } from "express";
import type { ExtendedRequest } from "src/types/extended-request.types";
import { IsEmail, IsString, MinLength } from 'class-validator';

class ConfirmEmailDto {
  @IsString()
  token: string;
}

class ResendEmailVerificationDto {
  @IsEmail()
  email: string;
}

class RequestPasswordResetDto {
  @IsEmail()
  email: string;
}

class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  confirmationPassword: string;
}

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

  @Post('confirm-email')
  async confirmEmail(@Body() body: ConfirmEmailDto) {
    return this.authService.confirmEmail(body.token);
  }

  @Post('resend-email-verification')
  async resendEmailVerification(@Body() body: ResendEmailVerificationDto) {
    return this.authService.resendEmailVerification(body.email);
  }

  @Post('forgot-password')
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password, body.confirmationPassword);
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
