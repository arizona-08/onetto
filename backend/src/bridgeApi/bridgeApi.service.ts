import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";

type BridgeHeaders = {
  "Bridge-Version": string;
  "Client-Id": string;
  "Client-Secret": string;
}

type Transaction = {
  amount: number;
  currency: string;
  beneficiary: {
    iban: string;
    first_name: string;
    last_name: string;
    company_name: string;
    email: string;
  },
  end_to_end_id: string;
  client_reference: string;
  execution_date: string;
}

type PaymentLinkData = {
  user : {
    company_name: string;
    email: string;
    external_reference: string;
  },
  expired_date: string;
  client_reference: string;
  transactions: Transaction[];
  callback_url: string;
}

type PaymentLinkResponse = {
  id: string;
  url: string;
}
@Injectable()
export class BridgeApiService {
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
  async createPaymentLink(paymentLinkData: PaymentLinkData): Promise<PaymentLinkResponse> {
    try {
      const response = await fetch(
        this.buildUrl("/payment-links"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.getBridgeHeaders(),
          },
          body: JSON.stringify(paymentLinkData),
        }
      );

      if(!response.ok) {
        const errorResponse = await response.json();
        console.error("Error response from Bridge API:", errorResponse);
        throw new InternalServerErrorException("Erreur lors de la création du lien de paiement", errorResponse.message);
      }

      const data = await response.json();

      await this.prismaService.$transaction(async (prisma) => {
        for (const transaction of paymentLinkData.transactions) {
          await prisma.bridgePaymentLink.create({
            data: {
              url: data.url,
              expiresAt: new Date(paymentLinkData.expired_date),
              documentId: transaction.client_reference, // id de la facture
              bridgePaymentLinkId: data.id,
            }
          });
        }
      } )

      return data as PaymentLinkResponse;
    } catch (error) {
      console.error("Error creating payment link:", error);
      throw new InternalServerErrorException("Erreur lors de la création du lien de paiement", (error as Error).message);
    }
  }
}