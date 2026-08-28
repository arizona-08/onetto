import { Module } from "@nestjs/common";
import { PaymentProviderFactory } from "./payment-provider.factory";
import { GoCardlessModule } from "./gocardless/gocardless.module";
import { BridgeModule } from "./bridge/bridge.module";
import { PaymentService } from "./payment.service";

@Module({
  imports:[GoCardlessModule, BridgeModule],
  providers: [PaymentProviderFactory, PaymentService],
  // Re-export the module rather than one of its providers: Nest only permits
  // a module to export its own providers or imported modules.
  exports: [PaymentService, GoCardlessModule],
})
export class PaymentProviderModule {}
