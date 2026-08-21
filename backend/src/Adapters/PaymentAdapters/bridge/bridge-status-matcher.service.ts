import { Injectable } from "@nestjs/common";
import { BridgeWebhookLinkStatus, BridgeWebhookTransactionStatus } from "./webhook-handlers/dtos/transaction.dto";
import { $Enums } from "@prisma/client";

@Injectable()
export class BridgeStatusMatcherService {
  constructor() {}

  transactionAttemptStatusMatcher(status: BridgeWebhookTransactionStatus): $Enums.InvoicePaymentAttemptStatus {
    switch (status) {
      case 'CREA':
      case 'ACTC':
        return 'PENDING';
      case 'PDNG':
        return 'PAYMENT_IN_PROGRESS';
      case 'ACSC':
        return 'SUCCESS';
      case 'RJCT':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }

  linkStatusMatcher(status: BridgeWebhookLinkStatus): $Enums.InvoicePaymentLinkStatus {
    switch (status) {
      case 'valid':
        return 'VALID';
      case 'expired':
        return 'EXPIRED';
      case 'revoked':
        return 'REVOKED';
      case 'completed':
        return 'COMPLETED';
      default:
        return 'VALID';
    }
  }


}