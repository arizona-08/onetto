import { Body, Controller, Get, Post, Request, UseGuards } from "@nestjs/common";
import { LoginDto } from "./dtos/login.dto";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService
  ) {}

  @Post('login')
  async login(
    @Body() body: LoginDto
  ){
    return await this.authService.login(body);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Request() req: any){
    return req.user;
  }
}