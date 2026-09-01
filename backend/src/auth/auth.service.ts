import { BadRequestException, HttpException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { LoginDto } from "./dtos/login.dto";
import argon2 from "argon2";
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from "express";
import { UserService } from "src/user/user.service";
import { MailService } from 'src/mail/mail.service';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly mailService: MailService,
  ) {}

  private setAccessTokenCookie(response: Response, accessToken: string) {
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });
  }

  private setRefreshTokenCookie(response: Response, refreshToken: string) {
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

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

      if (!existingUser.emailVerifiedAt) {
        throw new UnauthorizedException('Veuillez confirmer votre adresse e-mail avant de vous connecter.');
      }

      const payload = { sub: existingUser.id, email: existingUser.email, accountType: existingUser.accountType, subscriptionPlan: existingUser.subscriptionPlan };
      const token = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m'
      });

      const refreshToken = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d'
      });

      this.setAccessTokenCookie(response, token);
      this.setRefreshTokenCookie(response, refreshToken);

      const { password, ...userWithoutPassword } = existingUser;
      return {
        message: "Login successful.",
        user: userWithoutPassword,
      }
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadRequestException("An unexpected error occured while logging in.", error instanceof Error ? error.message : undefined);
    }
    
  }

  async refreshToken(req: Request, response: Response){
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
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      });

      this.setAccessTokenCookie(response, newAccessToken);

      return { message: "Token refreshed." };
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }
  }

  async logout(response: Response){
    response.clearCookie('access_token');
    response.clearCookie('refresh_token');
    return { message: 'Déconnexion réussie' };
  }

  async confirmEmail(token: string) {
    return this.userService.confirmEmail(token);
  }

  async resendEmailVerification(email: string) {
    return this.userService.resendEmailVerification(email);
  }

  async requestPasswordReset(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    const message = 'Si un compte correspond à cette adresse, un e-mail de réinitialisation a été envoyé.';

    if (!user) {
      return { message };
    }

    const token = randomBytes(32).toString('base64url');
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: this.hashToken(token),
        passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await this.mailService.sendMail({
        to: user.email,
        ...this.mailService.createPasswordResetMail({ resetUrl }),
      });
    } catch (error) {
      this.logger.error(
        `Unable to send password reset email to ${user.email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return { message };
  }

  async resetPassword(token: string, password: string, confirmationPassword: string) {
    if (password !== confirmationPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas.');
    }

    const user = await this.prismaService.user.findFirst({
      where: {
        passwordResetTokenHash: this.hashToken(token),
        passwordResetExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('Ce lien de réinitialisation est invalide ou a expiré.');
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        password: await argon2.hash(password),
        passwordChangedAt: new Date(),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return { message: 'Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.' };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
