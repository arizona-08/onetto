import { Injectable } from "@nestjs/common";
import { PaymentProviderInterface } from "../Interfaces/PaymentProvider.interface";
import { CreateRecurringPaymentLinkInput } from "../Types/InputTypes/CreateRecurringPaymentLinkInput.types";
import { PaymentLinkResponse } from "../Types/ResponseTypes/CreatePaymentLinkResponse.types";
import { CreatePaymentLinkInput } from "../Types/InputTypes/CreatePaymentLinkInput.types";
import { CreateVariablePaymentLinkInput } from "../Types/InputTypes/CreateVariablePaymentLinkInput.types";
import { PaymentStatus } from "../PaymentStatus/PaymentStatus.types";

@Injectable()
export class GoCardlessProviderService implements PaymentProviderInterface  {
  constructor() {}

  async createPaymentLink(input: CreatePaymentLinkInput, paymentAccessToken: string): Promise<PaymentLinkResponse> {
    return { url: "", paymentLinkId: "" };
  }
  
  async createRecurringPaymentLink(input: CreateRecurringPaymentLinkInput, paymentAccessToken: string): Promise<PaymentLinkResponse> {
    return { url: "", paymentLinkId: "" };
  }

  async createVariablePaymentLink(input: CreateVariablePaymentLinkInput, paymentAccessToken: string): Promise<PaymentLinkResponse> {
    return { url: "", paymentLinkId: "" };
  }

  async cancelPaymentLink(paymentLinkId: string): Promise<void> {
    return;
  }

  async getPaymentLinkStatus(paymentLinkId: string): Promise<PaymentStatus> {
    return 'PENDING';
  }

  async getPaymentTransactionStatus(paymentTransactionId: string): Promise<string> {
    return 'PENDING';
  }

  async handleWebhook(webhook: any): Promise<void> {
    return;
  }



}