import { Module } from "@nestjs/common";
import { BridgeWebhookService } from "./bridgeWebhook.service";
import { BridgeWebhookController } from "./bridgeWebhook.controller";

@Module({
  controllers: [BridgeWebhookController],
  providers: [BridgeWebhookService],
  exports: [BridgeWebhookService],
})
export class BridgeWebhookModule {}