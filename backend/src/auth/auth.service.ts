import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { LoginDto } from "./dtos/login.dto";
import argon2 from "argon2";
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(data: LoginDto){
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
      const token = await this.jwtService.signAsync(payload);

      const { password, ...userWithoutPassword } = existingUser;
      return {
        message: "Login successful.",
        user: userWithoutPassword,
        access_token: token
      }
    } catch (error: unknown) {
      throw new BadRequestException("An unexpected error occured while logging in.", error instanceof Error ? error.message : undefined);
    }
    
  }
}