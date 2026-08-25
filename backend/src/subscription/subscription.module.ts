import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "src/prisma/prisma.module";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";
import { AuthModule } from "src/auth/auth.module";
import { UserModule } from "src/user/user.module";
import { SubscriptionWebhookService } from "./subscription-webhook.service";
import { SubscriptionWebhookController } from "./subscription-webhook.controller";

@Module({
  imports: [PrismaModule, ConfigModule, AuthModule, UserModule],
  controllers: [SubscriptionController, SubscriptionWebhookController],
  providers: [SubscriptionService, SubscriptionWebhookService],
})
export class SubscriptionModule {}