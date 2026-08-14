import { Injectable } from "@nestjs/common";
import { PaymentProviderInterface } from "./Interfaces/PaymentProvider.interface";
import { BridgeProviderService } from "./bridge/bridge-provider.service";
import { GoCardlessProviderService } from "./gocardless/gocardless-provider.service";

export type PaymentProviderType = 
  | "BRIDGE"
  | "GOCARDLESS"


@Injectable()
export class PaymentProviderFactory {
  constructor(
    private readonly bridgeProviderService: BridgeProviderService,
    private readonly goCardlessProviderService: GoCardlessProviderService
  ) {}

  getProvider(providerType: PaymentProviderType): PaymentProviderInterface{
    switch (providerType) {
      case "BRIDGE":
        return this.bridgeProviderService;
      case "GOCARDLESS":
        return this.goCardlessProviderService;
      default:
        throw new Error(`Unsupported payment provider type: ${providerType}`);
    }
  }

}