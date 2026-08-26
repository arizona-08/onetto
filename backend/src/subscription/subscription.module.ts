import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "src/prisma/prisma.module";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";
import { AuthModule } from "src/auth/auth.module";
import { UserModule } from "src/user/user.module";
import { SubscriptionWebhookService } from "./subscription-webhook.service";
import { SubscriptionWebhookController } from "./subscription-webhook.controller";
import { PlanAccessModule } from 'src/plan-access/plan-access.module';

@Module({
  imports: [PrismaModule, ConfigModule, AuthModule, UserModule, PlanAccessModule],
  controllers: [SubscriptionController, SubscriptionWebhookController],
  providers: [SubscriptionService, SubscriptionWebhookService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
