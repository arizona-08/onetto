import { BadRequestException, Injectable } from "@nestjs/common";
import { BasePaymentProviderInterface, CanCreateRecurringPaymentLinkInterface, CanCreateSubscriptionLinkInterface } from "../Interfaces/PaymentProvider.interface";
import { CreateRecurringPaymentLinkInput } from "../Types/InputTypes/CreateRecurringPaymentLinkInput.types";
import { PaymentLinkResponse } from "../Types/ResponseTypes/CreatePaymentLinkResponse.types";
import { CreatePaymentLinkInput } from "../Types/InputTypes/CreatePaymentLinkInput.types";
import { PaymentStatus } from "../PaymentStatus/PaymentStatus.types";
import { CreateSubscriptionLinkInput } from "../Types/InputTypes/CreateSubscriptionLinkInput.types";
import { GoCardlessCreatePaymentRequestInput } from "./Interfaces/Requests/GoCardlessCreatePaymentRequestInput";
import { ConfigService } from "@nestjs/config";
import { GoCardlessOAuthService } from "./gocardless-oauth.service";
import { PrismaService } from "src/prisma/prisma.service";

const supportedOpenBankingSchemes = new Set([
  'faster_payments',
  'sepa_credit_transfer',
  'sepa_instant_credit_transfer',
  'pay_to',
]);



@Injectable()
export class GoCardlessProviderService
implements
  BasePaymentProviderInterface,
  CanCreateRecurringPaymentLinkInterface,
  CanCreateSubscriptionLinkInterface  {

  constructor(
    private readonly configService: ConfigService,
    private readonly gocardlessOAuthService: GoCardlessOAuthService,
    private readonly prismaService: PrismaService
  ) {}

  async createBillingRequest(companyId: string, input: GoCardlessCreatePaymentRequestInput){
    try {
      const amount = Math.round(input.payment_request.amount);
      const currency = input.payment_request.currency.toUpperCase();
      const description = input.payment_request.description.trim();

      if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new BadRequestException('Le montant GoCardless doit être un entier positif exprimé en centimes.');
      }

      if (currency !== 'EUR') {
        throw new BadRequestException('Les paiements GoCardless configurés ici doivent être en EUR.');
      }

      if (!description) {
        throw new BadRequestException('La description du paiement GoCardless est obligatoire.');
      }

      if (!supportedOpenBankingSchemes.has(input.payment_request.scheme)) {
        throw new BadRequestException('Le schéma de paiement GoCardless est invalide.');
      }

      const company = await this.prismaService.company.findUnique({
        where : { id: companyId },
        include: {
          companyPaymentAccount: true
        }
      });

      if(!company) {
        throw new BadRequestException("Aucune entreprise trouvée avec l'ID fourni.");
      }

      if(!company.companyPaymentAccount) {
        throw new BadRequestException("Aucun compte de paiement associé à cette entreprise.");
      }

      const client = await this.gocardlessOAuthService.getClientForCompany(companyId);

      const billingRequest = await client.billingRequests.create({
        payment_request: {
          description,
          amount: amount.toString(),
          currency,
          scheme: input.payment_request.scheme
        }
      });

      console.log("Billing Request Created:", billingRequest);

      return billingRequest.id;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error("Error creating billing request:", error);
      throw new BadRequestException("Erreur lors de la création de la demande de facturationnnn.", ( error as Error));
    }
  }

  async createPaymentLink(input: CreatePaymentLinkInput, paymentAccessToken: string): Promise<PaymentLinkResponse> {

    const billingRequestId = await this.createBillingRequest(input.companyId, {
      payment_request: {
        description: input.description ?? "Paiement pour la facture " + input.invoiceId,
        amount: input.amount * 100,
        currency: input.currency,
        scheme: "sepa_credit_transfer"
      }
    });

    const client = await this.gocardlessOAuthService.getClientForCompany(input.companyId);
    const frontendUrl = this.configService.get<string>('GOCARDLESS_REDIRECT_URI') || "";

    const billingRequestFlow = await client.billingRequestFlows.create({
      redirect_uri: `${frontendUrl}/payment/callback`,
      exit_uri: `${frontendUrl}/payment/callback`,
      links: {
        billing_request: billingRequestId
      }
    });

    console.log("Billing Request Flow:", billingRequestFlow);

    await this.prismaService.invoicePaymentLinkSession.create({
      data: {
        invoiceId: input.invoiceId,
        paymentAccessToken: paymentAccessToken,
        paymentLinkId: billingRequestId,
        url: billingRequestFlow.authorisation_url as string,
        linkStatus: "VALID",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        paymentStatus: "PENDING",
        provider: "GOCARDLESS"
      }
    });

    return { url: billingRequestFlow.authorisation_url as string, paymentLinkId: billingRequestId };
  }
  
  async createRecurringPaymentLink(input: CreateRecurringPaymentLinkInput, paymentAccessToken: string): Promise<PaymentLinkResponse> {
    return { url: "", paymentLinkId: "" };
  }

  async createSubscriptionLink(input: CreateSubscriptionLinkInput, paymentAccessToken: string): Promise<PaymentLinkResponse> {
    return { url: "", paymentLinkId: "" };
  }

  async cancelPaymentLink(paymentLinkId: string): Promise<void> {
    return;
  }

  async getPaymentLinkStatus(paymentLinkId: string): Promise<PaymentStatus> {
    return 'PENDING';
  }

  async getPaymentTransactionStatus(paymentTransactionId: string): Promise<string> {
    return 'PENDING';
  }

  async handleWebhook(webhook: any): Promise<void> {
    return;
  }
}
