import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { BasePaymentProviderInterface } from "../Interfaces/PaymentProvider.interface";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";
import { PaymentLinkResponse } from "../Types/ResponseTypes/CreatePaymentLinkResponse.types";
import { PaymentStatus } from "../PaymentStatus/PaymentStatus.types";
import { BridgeCreatePaymentLinkInput } from "./input.types";
import { BridgeWebhookTransactionStatus } from "./webhook-handlers/dtos/transaction.dto";
import { $Enums } from "@prisma/client";

type BridgeHeaders = {
  "Bridge-Version": string;
  "Client-Id": string;
  "Client-Secret": string;
}

@Injectable()
export class BridgeProviderService implements BasePaymentProviderInterface {
  private baseUrl: string;
  private authCredentials: { clientId: string; clientSecret: string };
  private bridgeVersion: string;

  constructor(
    configService: ConfigService,
    private readonly prismaService: PrismaService
  ) {
    this.baseUrl = configService.getOrThrow("BRIDGE_API_BASE_URL") || "https://api.bridgeapi.io./v3";
    this.bridgeVersion = configService.getOrThrow("BRIDGE_API_VERSION") || "2025-01-15";
    this.authCredentials = {
      clientId: configService.getOrThrow("CLIENT_ID"),
      clientSecret: configService.getOrThrow("CLIENT_SECRET")
    };
  }

  buildUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`;
  }

  getBridgeHeaders(): BridgeHeaders {
    return {
      "Bridge-Version": this.bridgeVersion,
      "Client-Id": this.authCredentials.clientId,
      "Client-Secret": this.authCredentials.clientSecret,
    };
  }

  // enregistrer le payment link en bdd
  async createPaymentLink(
    input: BridgeCreatePaymentLinkInput,
    paymentAccessToken: string,
  ): Promise<PaymentLinkResponse> {
    try {
      const response = await fetch(
        this.buildUrl("/payment/payment-links"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.getBridgeHeaders(),
          },
          body: JSON.stringify(input),
        }
      );

      if(!response.ok) {
        const errorResponse = await response.json();
        console.error("Error response from Bridge API:", errorResponse);
        console.error("beneficiary", input.transactions[0].beneficiary)
        throw new InternalServerErrorException("Erreur lors de la création du lien de paiement", errorResponse.message);
      }

      const data = await response.json();

      await this.prismaService.$transaction(async (prisma) => {
        for (const transaction of input.transactions) {
          await prisma.invoicePaymentLinkSession.create({
            data: {
              paymentLinkId: data.id,
              paymentAccessToken,
              invoiceId: transaction.client_reference, // id de la facture
              url: data.url,
              expiresAt: new Date(input.expired_date),
              paymentStatus: 'PENDING',
            }
          });
        }
      } )

      return {
        paymentLinkId: data.id,
        url: data.url
      } as PaymentLinkResponse;
    } catch (error) {
      console.error("Error creating payment link:", error);
      throw new InternalServerErrorException("Erreur lors de la création du lien de paiement", (error as Error).message);
    }
  }

  async cancelPaymentLink(paymentLinkId: string): Promise<void> {}

  async getPaymentLinkStatus(paymentLinkId: string): Promise<PaymentStatus> {
    return 'PENDING'
  }

  async getPaymentTransactionStatus(paymentTransactionId: string): Promise<string> {
    return '';
  }

  async handleWebhook(webhook: any): Promise<void> {}

  transactionStatusMatcher(status: BridgeWebhookTransactionStatus): $Enums.InvoiceStatus {
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