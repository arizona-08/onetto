import { Module } from "@nestjs/common";
import { BridgeApiService } from "./bridgeApi.service";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [BridgeApiService],
  exports: [BridgeApiService],
})
export class BridgeApiModule{}