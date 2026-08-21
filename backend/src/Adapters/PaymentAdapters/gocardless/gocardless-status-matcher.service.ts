import { Injectable } from "@nestjs/common";
import { $Enums } from "@prisma/client";

type GoCardlesshPaymentAccountVerificationStatus = "action_required" | "in_review" | "successful" | undefined;

@Injectable()
export class GoCardlessStatusMatcherService {
  constructor(){}

  matchPaymentAccountVerificationStatus(status: GoCardlesshPaymentAccountVerificationStatus): $Enums.CompanyPaymentAccountVerificationStatus {
    switch (status) {
      case "action_required":
        return "NOT_VERIFIED"
      case "in_review":
        return "IN_REVIEW"
      case "successful":
        return "VERIFIED"
      default: 
        return "NOT_VERIFIED"
    }
  }

  matchPaymentAttemptStatus(status: string): $Enums.InvoicePaymentAttemptStatus {
    switch (status) {
      case "created":
      case "pending_submission":
      case "pending_customer_approval":
        return "PENDING"
      case "submitted":
        return "PAYMENT_IN_PROGRESS"
      case "confirmed":
      case "paid_out":
        return "SUCCESS"
      case "failed":
      case "cancelled":
        return "FAILED"
      default: 
        return "FAILED"
    }
  }

  matchLinkStatus(status: string): $Enums.InvoicePaymentLinkStatus {
    switch (status) {
      case "pending":
      case "ready_to_fullfill":
      case "fulfilling":
        return "VALID"
      case "fulfilled":
        return "COMPLETED"
      default:
        return "FAILED"
    }
  }

  matchSessionStatus(status: string): $Enums.InvoicePaymentStatus {
    switch (status) {
      default:
        return "PENDING"
    }
  }
}