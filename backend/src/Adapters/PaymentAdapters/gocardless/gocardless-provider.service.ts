import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
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
import { PlanAccessService } from 'src/plan-access/plan-access.service';

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
    private readonly prismaService: PrismaService,
    private readonly planAccessService: PlanAccessService,
  ) {}

  private buildPrefilledCustomer(customer: CreatePaymentLinkInput['customer']) {
    return {
      email: customer.email,
      ...(customer.firstName ? { given_name: customer.firstName } : {}),
      ...(customer.lastName ? { family_name: customer.lastName } : {}),
      ...(customer.addressLine1 ? { address_line1: customer.addressLine1 } : {}),
      ...(customer.city ? { city: customer.city } : {}),
      ...(customer.postalCode ? { postal_code: customer.postalCode } : {}),
      ...(customer.countryCode ? { country_code: customer.countryCode } : {}),
    };
  }

  async createBillingRequest(mode: 'ONE_TIME' | 'INSTALMENTS', companyId: string, input: GoCardlessCreatePaymentRequestInput){
    try {
      const paymentRequest = input.payment_request;
      const amount = Math.round(paymentRequest?.amount as number);
      const currency = paymentRequest?.currency.toUpperCase();
      const description = paymentRequest?.description.trim();

      if (mode === 'ONE_TIME') {
        if (!Number.isSafeInteger(amount) || amount <= 0) {
          throw new BadRequestException('Le montant GoCardless doit être un entier positif exprimé en centimes.');
        }

        if (currency !== 'EUR') {
          throw new BadRequestException('Les paiements GoCardless configurés ici doivent être en EUR.');
        }

        if (!description) {
          throw new BadRequestException('La description du paiement GoCardless est obligatoire.');
        }

        if (!supportedOpenBankingSchemes.has(paymentRequest?.scheme as string)) {
          throw new BadRequestException('Le schéma de paiement GoCardless est invalide.');
        }
      } else if (input.mandate_request?.scheme !== 'sepa_core') {
        throw new BadRequestException(
          'Les échéances GoCardless en EUR nécessitent un mandat SEPA Core.',
        );
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

      let billingRequest;

      if(mode === 'ONE_TIME'){
        billingRequest = await client.billingRequests.create({
          payment_request: {
            description,
            amount: amount.toString(),
            currency,
            scheme: input.payment_request?.scheme as string
          }
        });
      } else if(mode === 'INSTALMENTS'){
        billingRequest = await client.billingRequests.create({
          mandate_request: {
            scheme: input.mandate_request?.scheme as string,
          }
        })
      }

      console.log(`Billing Request ${mode} Created:`, billingRequest);

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
    if(input.paymentMode === 'ONE_TIME') {
      return await this.createOneTimePaymentLink(input, paymentAccessToken);
    }

   return await this.createInstalmentsPaymentLink(input, paymentAccessToken);
  }

  async createOneTimePaymentLink(input: CreatePaymentLinkInput, paymentAccessToken: string): Promise<PaymentLinkResponse> {
    const billingRequestId = await this.createBillingRequest('ONE_TIME', input.companyId, {
      payment_request: {
        description: input.description ?? "Paiement pour la facture " + input.invoiceId,
        amount: input.amount,
        currency: input.currency,
        scheme: "sepa_credit_transfer"
      }
    });

    const client = await this.gocardlessOAuthService.getClientForCompany(input.companyId);

    const redirectUri = this.configService.get<string>('GOCARDLESS_REDIRECT_URI') || "";

    const billingRequestFlow = await client.billingRequestFlows.create({
      redirect_uri: redirectUri,
      exit_uri: redirectUri,
      prefilled_customer: this.buildPrefilledCustomer(input.customer),
      links: {
        billing_request: billingRequestId
      }
    });

    console.log("Billing Request Flow:", billingRequestFlow);

    const persistedPaymentLink = await this.prismaService.invoicePaymentLink.create({
      data: {
        invoiceId: input.invoiceId,
        url: billingRequestFlow.authorisation_url as string,
        provider: "GOCARDLESS",
        providerReference: billingRequestId
      }
    });

    await this.prismaService.invoicePublicAccess.create({
        data: {
          accessToken: paymentAccessToken,
          invoiceId: input.invoiceId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          invoicePaymentLinkId: persistedPaymentLink.id
        }
    })

    await this.prismaService.payByBankPayment.create({
      data: {
        invoiceId: input.invoiceId,
        providerReference: billingRequestId,
        amountInCents: input.amount,
        invoicePaymentLinkId: persistedPaymentLink.id,
        status: "PENDING",
        provider: "GOCARDLESS"
      }
    });

    return { url: billingRequestFlow.authorisation_url as string, paymentLinkId: billingRequestId };
  }

  async createInstalmentsPaymentLink(input: CreatePaymentLinkInput, paymentAccessToken: string): Promise<PaymentLinkResponse> {
    try {
      await this.planAccessService.assertFeatureAvailable(
        input.companyId,
        'instalments',
      );
      
      
      const client = await this.gocardlessOAuthService.getClientForCompany(input.companyId);
      
      const billingRequestId = await this.createBillingRequest('INSTALMENTS', input.companyId, {
        mandate_request: {
          scheme: "sepa_core"
        }
      });
      const existingBillingRequest = await client.billingRequests.find(billingRequestId);
      
      if(!existingBillingRequest) {
        throw new BadRequestException("Aucune demande de facturation trouvée avec l'ID fourni.");
      }
      
      await this.generateInstalmentPlan(input.invoiceId, billingRequestId, input.instalments_details as CreatePaymentLinkInput["instalments_details"]);
      
      const createdBillingRequestFlow = await client.billingRequestFlows.create({
        redirect_uri: this.configService.get<string>('GOCARDLESS_REDIRECT_URI') || "",
        exit_uri: this.configService.get<string>('GOCARDLESS_REDIRECT_URI') || "",
        prefilled_customer: this.buildPrefilledCustomer(input.customer),
        links: {
          billing_request: billingRequestId
        }
      });

      const persistedPaymentLink = await this.prismaService.invoicePaymentLink.create({
      data: {
        invoiceId: input.invoiceId,
        url: createdBillingRequestFlow.authorisation_url as string,
        provider: "GOCARDLESS",
        providerReference: billingRequestId
      }
    });

    await this.prismaService.invoicePublicAccess.create({
        data: {
          accessToken: paymentAccessToken,
          invoiceId: input.invoiceId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          invoicePaymentLinkId: persistedPaymentLink.id
        }
    })

      return { url: createdBillingRequestFlow.authorisation_url as string, paymentLinkId: billingRequestId };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error("Une erreur est survenue lors d'un création de paiement avec plusieurs échéances", error);
      throw new InternalServerErrorException("Une erreur est survenue lors d'un création de paiement avec plusieurs échéances", ( error as Error));
    }
  }

  async generateInstalmentPlan(invoiceId: string, billingRequestId: string, input: CreatePaymentLinkInput["instalments_details"]){
    const instalmentPlan = await this.prismaService.invoiceInstalmentPlan.findUnique({
      where: { invoiceId },
      select: { id: true },
    });

    if (!instalmentPlan) {
      throw new BadRequestException(
        "L'échéancier métier de cette facture n'a pas été trouvé.",
      );
    }

    // The business schedule is created with the invoice. Provider information
    // is attached only when the customer payment flow is initiated.
    await this.prismaService.invoiceInstalmentPlan.update({
      where: { id: instalmentPlan.id },
      data: { providerReference: billingRequestId },
    });
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
