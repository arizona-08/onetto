import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { BasePaymentProviderInterface } from "../Interfaces/PaymentProvider.interface";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";
import { PaymentLinkResponse } from "../Types/ResponseTypes/CreatePaymentLinkResponse.types";
import { PaymentStatus } from "../PaymentStatus/PaymentStatus.types";
import { BridgeCreatePaymentLinkInput } from "./input.types";
import { BridgeWebhookTransactionStatus } from "./webhook-handlers/dtos/transaction.dto";
import { $Enums } from "@prisma/client";
import { CreatePaymentLinkInput } from "../Types/InputTypes/CreatePaymentLinkInput.types";

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
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService
  ) {
    this.baseUrl = this.configService.getOrThrow("BRIDGE_API_BASE_URL") || "https://api.bridgeapi.io./v3";
    this.bridgeVersion = this.configService.getOrThrow("BRIDGE_API_VERSION") || "2025-01-15";
    this.authCredentials = {
      clientId: this.configService.getOrThrow("CLIENT_ID"),
      clientSecret: this.configService.getOrThrow("CLIENT_SECRET")
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
    input: CreatePaymentLinkInput,
    paymentAccessToken: string
  ): Promise<PaymentLinkResponse> {
    try {

      const invoice = await this.prismaService.document.findUnique({
      where: {id: input.invoiceId},
      include: {
        company: {
          select: {
            id: true,
            name: true,
            IBAN: true,
            email: true,
          }
        }
      }
    });

    if(!invoice) {
      throw new BadRequestException(`Invoice with ID ${input.invoiceId} not found`);
    }

    const callbackUrl = this.configService.getOrThrow("BRIDGE_WEBHOOK_CALLBACK_URL");

    const bridgeDataInput: BridgeCreatePaymentLinkInput = {
      user: {
        company_name: invoice.clientName,
        email: invoice.clientEmail,
        external_reference: invoice.id,
      },
      client_reference: invoice.id,
      expired_date: invoice.paymentDueAt.toISOString(),
      transactions: [{
        amount: input.amount,
        currency: input.currency,
        client_reference: invoice.id,
        execution_date: invoice.paymentDueAt.toISOString(),
        // beneficiary: {                 // À autoriser avec les dynamic beneficiaries
        //   company_name: invoice.company.name,
        //   iban: invoice.company.IBAN,
        //   email: invoice.company.email,
        // }
      }],
      callback_url: callbackUrl
    }

      const response = await fetch(
        this.buildUrl("/payment/payment-links"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.getBridgeHeaders(),
          },
          body: JSON.stringify(bridgeDataInput),
        }
      );

      if(!response.ok) {
        const errorResponse = await response.json();
        console.error("Error response from Bridge API:", errorResponse);
        console.error("beneficiary", bridgeDataInput.transactions[0].beneficiary)
        throw new InternalServerErrorException("Erreur lors de la création du lien de paiement", errorResponse.message);
      }

      const responseData = await response.json();

      // gérer Bridge
      
      // await this.prismaService.$transaction(async (prisma) => {
      //   for (const transaction of bridgeDataInput.transactions) {
      //     await prisma.payByBankPayment.create({
      //       data: {
      //         invoicePaymentLinkId: responseData.id,
      //         invoiceId: transaction.client_reference, // id de la facture
      //         url: responseData.url,
      //         expiresAt: new Date(bridgeDataInput.expired_date),
      //         paymentStatus: 'PENDING',
      //       }
      //     });
      //   }
      // } )

      return {
        paymentLinkId: responseData.id,
        url: responseData.url
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