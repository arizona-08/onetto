import { Module } from "@nestjs/common";
import { BridgeWebhookService } from "./bridgeWebhook.service";
import { BridgeWebhookController } from "./bridgeWebhook.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [BridgeWebhookController],
  providers: [BridgeWebhookService],
  exports: [BridgeWebhookService],
})
export class BridgeWebhookModule {}
