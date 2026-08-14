import { CreatePaymentLinkInput } from "../Types/InputTypes/CreatePaymentLinkInput.types";
import { CreateRecurringPaymentLinkInput } from "../Types/InputTypes/CreateRecurringPaymentLinkInput.types";
import { CreateVariablePaymentLinkInput } from "../Types/InputTypes/CreateVariablePaymentLinkInput.types";
import { PaymentStatus } from "../PaymentStatus/PaymentStatus.types";
import { PaymentLinkResponse } from "../Types/ResponseTypes/CreatePaymentLinkResponse.types";

export interface PaymentProviderInterface {
  createPaymentLink(input: CreatePaymentLinkInput, paymentAccessToken: string): Promise<PaymentLinkResponse>;
  createRecurringPaymentLink?(input: CreateRecurringPaymentLinkInput, paymentAccessToken: string): Promise<PaymentLinkResponse>;
  createVariablePaymentLink?(input: CreateVariablePaymentLinkInput, paymentAccessToken: string): Promise<PaymentLinkResponse>;
  cancelPaymentLink(paymentLinkId: string): Promise<void>;
  getPaymentLinkStatus(paymentLinkId: string): Promise<PaymentStatus>;
  getPaymentTransactionStatus(paymentTransactionId: string): Promise<string>;
  handleWebhook(webhook: any): Promise<void>;
}