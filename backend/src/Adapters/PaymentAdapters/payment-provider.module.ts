import { Module } from "@nestjs/common";
import { PaymentProviderFactory } from "./payment-provider.factory";
import { GoCardlessModule } from "./gocardless/gocardless.module";
import { BridgeModule } from "./bridge/bridge.module";
import { PaymentService } from "./payment.service";

@Module({
  imports:[GoCardlessModule, BridgeModule],
  providers: [PaymentProviderFactory, PaymentService],
  exports: [PaymentService],
})
export class PaymentProviderModule {}