import { BadRequestException, HttpException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { LoginDto } from "./dtos/login.dto";
import argon2 from "argon2";
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from "express";

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(data: LoginDto, response: Response){
    try {
      const existingUser = await this.prismaService.user.findUnique({
        where: { email: data.email }
      });

      if(!existingUser){
        throw new BadRequestException("Invalid email or password.");
      }

      const isPasswordValid = await argon2.verify(existingUser.password, data.password);
      if(!isPasswordValid){
        throw new BadRequestException("Invalid email or password.");
      }

      const payload = { sub: existingUser.id, email: existingUser.email, role: existingUser.role };
      const token = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m'
      });

      const refreshToken = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d'
      });

      response.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      const { password, ...userWithoutPassword } = existingUser;
      return {
        message: "Login successful.",
        user: userWithoutPassword,
        access_token: token
      }
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadRequestException("An unexpected error occured while logging in.", error instanceof Error ? error.message : undefined);
    }
    
  }

  async refreshToken(req: Request){
    const refreshToken = req.cookies["refresh_token"];

    if(!refreshToken){
      throw new UnauthorizedException("No refresh token provided.");
    }

    try{
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // 3. Si valide, créer un nouvel access token tout neuf
      const newPayload = { sub: payload.sub, email: payload.email };
      const newAccessToken = await this.jwtService.signAsync(newPayload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      });

      return { accessToken: newAccessToken };
    } catch  {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }
  }

  async logout(response: Response){
    response.clearCookie('refresh_token');
    return { message: 'Déconnexion réussie' };
  }
}
