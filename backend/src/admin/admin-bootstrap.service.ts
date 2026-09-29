import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AccountType, SubscriptionPlan } from '@prisma/client';
import argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!email || !password) {
      this.logger.warn(
        'Création de l’administrateur ignorée : ADMIN_EMAIL ou ADMIN_PASSWORD est manquant.',
      );
      return;
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, isAdmin: true },
    });

    if (existingUser) {
      if (!existingUser.isAdmin) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { isAdmin: true },
        });
        this.logger.log(`Compte administrateur activé pour ${email}.`);
      }
      return;
    }

    const hashedPassword = await argon2.hash(password);

    await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          firstname: 'Admin',
          lastname: 'Onetto',
          email,
          password: hashedPassword,
          emailVerifiedAt: new Date(),
          accountType: AccountType.BUSINESS_OWNER,
          isAdmin: true,
          subscriptionPlan: SubscriptionPlan.FREE,
        },
      });

      await transaction.userSubscription.create({
        data: {
          userId: user.id,
          subscriptionPlan: SubscriptionPlan.FREE,
          isActive: true,
        },
      });
    });

    this.logger.log(`Compte administrateur créé pour ${email}.`);
  }
}
