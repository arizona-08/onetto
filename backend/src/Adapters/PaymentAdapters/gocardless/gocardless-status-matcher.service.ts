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
}