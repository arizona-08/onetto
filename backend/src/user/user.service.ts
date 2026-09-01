import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { MailService } from 'src/mail/mail.service';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async findAll() {
    return this.prismaService.user.findMany();
  }

  async create(data: CreateUserDto) {
    try {
      const email = data.email.trim().toLowerCase();
      const existingUser = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already in use.');
      }

      if (data.password !== data.confirmationPassword) {
        throw new BadRequestException('Passwords do not match.');
      }

      const hashedPassword = await argon2.hash(data.password);
      const verificationToken = this.createVerificationToken();

      const createdUser = await this.prismaService.$transaction(
        async (prisma) => {
          const user = await prisma.user.create({
            data: {
              firstname: data.firstname,
              lastname: data.lastname,
              email,
              password: hashedPassword,
              subscriptionPlan: 'FREE',
              emailVerificationTokenHash: this.hashVerificationToken(verificationToken),
              emailVerificationExpiresAt: this.verificationExpiry(),
            },
          });

          await prisma.userSubscription.create({
            data: {
              userId: user.id,
              subscriptionPlan: 'FREE',
              isActive: true,
            },
          });

          return user;
        },
      );

      await this.sendVerificationEmail(createdUser.email, verificationToken);

      const { password, ...userWithoutPassword } = createdUser;

      return {
        message: 'User created successfully.',
        user: userWithoutPassword,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An unexpected error occured while creating the user.',
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  async confirmEmail(token: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        emailVerificationTokenHash: this.hashVerificationToken(token),
        emailVerificationExpiresAt: { gt: new Date() },
      },
      select: { id: true, emailVerifiedAt: true },
    });

    if (!user) {
      throw new BadRequestException('Ce lien de confirmation est invalide ou a expiré.');
    }

    if (!user.emailVerifiedAt) {
      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: new Date(),
          emailVerificationTokenHash: null,
          emailVerificationExpiresAt: null,
        },
      });
    }

    return { message: 'Votre adresse e-mail a été confirmée. Vous pouvez maintenant vous connecter.' };
  }

  async resendEmailVerification(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerifiedAt: true },
    });

    // Same response whether or not an account exists, to avoid revealing registered emails.
    if (!user || user.emailVerifiedAt) {
      return { message: 'Si un compte non confirmé correspond à cette adresse, un e-mail de confirmation a été envoyé.' };
    }

    const token = this.createVerificationToken();
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        emailVerificationTokenHash: this.hashVerificationToken(token),
        emailVerificationExpiresAt: this.verificationExpiry(),
      },
    });
    await this.sendVerificationEmail(user.email, token);

    return { message: 'Si un compte non confirmé correspond à cette adresse, un e-mail de confirmation a été envoyé.' };
  }

  private createVerificationToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashVerificationToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private verificationExpiry(): Date {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  private async sendVerificationEmail(email: string, token: string) {
    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const verificationUrl = `${frontendUrl}/auth/confirm-email?token=${encodeURIComponent(token)}`;

    try {
      await this.mailService.sendMail({
        to: email,
        ...this.mailService.createEmailVerificationMail({ verificationUrl }),
      });
    } catch (error) {
      this.logger.error(
        `Unable to send email verification to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async findBy(search: 'email' | 'id', value: string) {
    try {
      const user = await this.prismaService.user.findFirst({
        where: { [search]: value },
      });

      if (!user) {
        throw new BadRequestException(
          `User with ${search} ${value} not found.`,
        );
      }

      const { password, ...userWithoutPassword } = user;

      return userWithoutPassword;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `An unexpected error occured while retrieving the user with ${search}: ${value}`,
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    try {
      const email = data.email.trim().toLowerCase();
      const existingUser = await this.prismaService.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true },
      });
      const emailChanged = existingUser.email !== email;
      const verificationToken = emailChanged ? this.createVerificationToken() : undefined;
      const user = await this.prismaService.user.update({
        where: { id: userId },
        data: {
          firstname: data.firstname.trim(),
          lastname: data.lastname.trim(),
          email,
          ...(verificationToken
            ? {
                emailVerifiedAt: null,
                emailVerificationTokenHash: this.hashVerificationToken(verificationToken),
                emailVerificationExpiresAt: this.verificationExpiry(),
              }
            : {}),
        },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          accountType: true,
          emailVerifiedAt: true,
        },
      });

      if (verificationToken) {
        await this.sendVerificationEmail(user.email, verificationToken);
      }

      return {
        message: verificationToken
          ? 'Profil mis à jour. Confirmez votre nouvelle adresse e-mail pour continuer à utiliser votre compte.'
          : 'Profil mis à jour.',
        user,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Cette adresse e-mail est déjà utilisée.',
        );
      }
      throw error;
    }
  }

  async changePassword(userId: string, data: ChangePasswordDto) {
    if (data.newPassword !== data.confirmationPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas.');
    }

    const user = await this.prismaService.user.findUniqueOrThrow({
      where: { id: userId },
      select: { password: true },
    });
    const currentPasswordIsValid = await argon2.verify(
      user.password,
      data.currentPassword,
    );
    if (!currentPasswordIsValid) {
      throw new BadRequestException('Le mot de passe actuel est incorrect.');
    }

    await this.prismaService.user.update({
      where: { id: userId },
      data: { password: await argon2.hash(data.newPassword) },
    });

    return { message: 'Mot de passe mis à jour.' };
  }
}
