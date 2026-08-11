import { Module } from "@nestjs/common";
import { BridgeApiService } from "./bridgeApi.service";

@Module({
  providers: [BridgeApiService],
  exports: [BridgeApiService],
})
export class BridgeApiModule{}