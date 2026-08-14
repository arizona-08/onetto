import { BridgeCreatePaymentLinkInput } from "../../bridge/input.types";
import { GoCardlessCreatePaymentLinkInput } from "../../gocardless/input.types";

export type CreatePaymentLinkInput =
  | GoCardlessCreatePaymentLinkInput
  | BridgeCreatePaymentLinkInput;