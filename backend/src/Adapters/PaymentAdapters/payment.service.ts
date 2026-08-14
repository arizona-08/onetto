import { Injectable } from "@nestjs/common";
import { PaymentProviderFactory, PaymentProviderType } from "./payment-provider.factory";
import { CreatePaymentLinkInput } from "./Types/InputTypes/CreatePaymentLinkInput.types";

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentProviderFactory: PaymentProviderFactory
  ) {}


  async createPaymentLink(providerType: PaymentProviderType, input: CreatePaymentLinkInput, paymentAccessToken: string){
    const paymentProvider = this.paymentProviderFactory.getProvider(providerType);
    return await paymentProvider.createPaymentLink(input, paymentAccessToken);
  }
}