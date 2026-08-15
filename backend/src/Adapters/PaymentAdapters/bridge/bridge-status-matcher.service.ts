import { Injectable } from "@nestjs/common";
import { BridgeWebhookTransactionStatus } from "./webhook-handlers/dtos/transaction.dto";
import { $Enums } from "@prisma/client";

@Injectable()
export class BridgeStatusMatcherService {
  constructor() {}

  invoicePaymentStatusMatcher(status: string): $Enums.InvoiceStatus {
    switch (status) {
      case 'CREA':
      case 'ACTC':
        return 'PENDING';
      case 'PDNG':
        return 'PAYMENT_IN_PROGRESS';
      case 'ACSC':
        return 'PAID';
      case 'RJCT':
        return 'REJECTED';
      default:
        return 'PENDING';
    }
  }

  transactionAttemptStatusMatcher(status: BridgeWebhookTransactionStatus): $Enums.InvoiceStatus {
    switch (status) {
      case 'CREA':
      case 'ACTC':
        return 'PENDING';
      case 'PDNG':
        return 'PAYMENT_IN_PROGRESS';
      case 'ACSC':
        return 'PAID';
      case 'RJCT':
        return 'REJECTED';
      default:
        return 'PENDING';
    }
  }


}