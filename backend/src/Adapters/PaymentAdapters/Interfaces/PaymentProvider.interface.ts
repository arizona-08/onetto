import { CreatePaymentLinkInput } from "../Types/InputTypes/CreatePaymentLinkInput.types";
import { CreateRecurringPaymentLinkInput } from "../Types/InputTypes/CreateRecurringPaymentLinkInput.types";
import { PaymentStatus } from "../PaymentStatus/PaymentStatus.types";
import { PaymentLinkResponse } from "../Types/ResponseTypes/CreatePaymentLinkResponse.types";
import { CreateSubscriptionLinkInput } from "../Types/InputTypes/CreateSubscriptionLinkInput.types";

export interface BasePaymentProviderInterface {
  createPaymentLink(input: CreatePaymentLinkInput, paymentAccessToken: string): Promise<PaymentLinkResponse>;
  cancelPaymentLink(paymentLinkId: string): Promise<void>;
  getPaymentLinkStatus(paymentLinkId: string): Promise<PaymentStatus>;
  getPaymentTransactionStatus(paymentTransactionId: string): Promise<string>;
  handleWebhook(webhook: any): Promise<void>;
}

export interface CanCreateRecurringPaymentLinkInterface {
  createRecurringPaymentLink(input: CreateRecurringPaymentLinkInput, paymentAccessToken: string): Promise<PaymentLinkResponse>;
}
export interface CanCreateSubscriptionLinkInterface {
  createSubscriptionLink(input: CreateSubscriptionLinkInput, paymentAccessToken: string): Promise<PaymentLinkResponse>;
}