import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import { Environments, GoCardlessClient } from "gocardless-nodejs";
import { PrismaService } from "src/prisma/prisma.service";
import { GoCardlessStatusMatcherService } from "./gocardless-status-matcher.service";
import { $Enums } from "@prisma/client";

type GetAccessTokenResponse = {
  scope: string,
  authorising_user_scope: string,
  token_type: string,
  organisation_id: string,
  email: string,
  active: boolean,
  access_token: string,
  user_id: string

}

@Injectable()
export class GoCardlessOAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly gocardlessStatusMatcherService: GoCardlessStatusMatcherService
  ){}

  async buildAuthorizationUrl(input: {
    email?: string;
    companyId: string;
  }) {
    console.log("Building authorization URL for companyId:", input.companyId, "and email:", input.email);
    const existingCompany = await this.prismaService.company.findUnique({
      where: { id: input.companyId }
    });

    if (!existingCompany) {
      throw new BadGatewayException(`Company with ID ${input.companyId} does not exist.`);
    }

    const state = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes

    await this.prismaService.companyPaymentOAuthState.create({
      data: {
        companyId: input.companyId,
        state,
        expiresAt
      }
    });

    const url = new URL(
      'https://connect-sandbox.gocardless.com/oauth/authorize',
    );

    url.searchParams.set(
      'client_id',
      this.configService.getOrThrow('GOCARDLESS_CLIENT_ID'),
    );

    const redirectUri = this.configService.getOrThrow('GOCARDLESS_OAUTH_REDIRECT_URL');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', 'read_write');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', state);

    url.searchParams.set('initial_view', 'login');

    if (input.email) {
      url.searchParams.set('prefill[email]', input.email);
    }

    console.log("Generated GoCardless authorization URL:", url.toString());

    return {url: url.toString()};
  }

  private async getAccessTokenFromAuthorizationCode(authorizationCode: string): Promise<GetAccessTokenResponse> {
    const response = await fetch(
      'https://connect-sandbox.gocardless.com/oauth/access_token',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          grant_type: 'authorization_code',

          code: authorizationCode,

          client_id: this.configService.getOrThrow('GOCARDLESS_CLIENT_ID'),

          client_secret: this.configService.getOrThrow('GOCARDLESS_CLIENT_SECRET'),

          redirect_uri: this.configService.getOrThrow('GOCARDLESS_OAUTH_REDIRECT_URL'),
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();

      throw new BadGatewayException(
        `GoCardless OAuth failed: ${error}`,
      );
    }

    return response.json();
  }

  getOnBoardingFlowUrl(): string {
    const isDevelopment = this.configService.getOrThrow('ENVIRONMENT') === 'development';
    return isDevelopment
      ? 'https://verify-sandbox.gocardless.com'
      : 'https://verify.gocardless.com';
  }

  async connectCompanyWithGoCardless(authorizationCode: string, state: string): Promise<string> {
    const companyPaymentOAuthState = await this.prismaService.companyPaymentOAuthState.findUnique({
      where: { state },
    });

    if (!companyPaymentOAuthState) {
      throw new BadGatewayException('Invalid or expired state parameter.');
    }

    if (companyPaymentOAuthState.expiresAt < new Date()) {
      throw new BadGatewayException('State parameter has expired.');
    }

    const existingCompany = await this.prismaService.company.findUnique({
      where: { id: companyPaymentOAuthState.companyId }
    });

    if (!existingCompany) {
      throw new BadGatewayException(`Company with ID ${companyPaymentOAuthState.companyId} does not exist.`);
    }


    const accessTokenResponse = await this.getAccessTokenFromAuthorizationCode(authorizationCode);
    // console.log({
    //   active: accessTokenResponse.active,
    //   organisationId: accessTokenResponse.organisation_id,
    //   scope: accessTokenResponse.scope,
    // });
    await this.prismaService.companyPaymentAccount.upsert({
      where: { companyId: existingCompany.id },
      create: {
        companyId: existingCompany.id,
        provider: 'GOCARDLESS',
        providerAccountId: accessTokenResponse.organisation_id,
        accessToken: accessTokenResponse.access_token,
      },
      update: {
        provider: 'GOCARDLESS',
        providerAccountId: accessTokenResponse.organisation_id,
        accessToken: accessTokenResponse.access_token,
        creditorId: null,
        verificationStatus: 'NOT_VERIFIED',
      },
    });

    await this.prismaService.companyPaymentOAuthState.delete({
      where: { state },
    });

    await this.prismaService.company.update({
      where: { id: existingCompany.id },
      data: {
        isPaymentAccountConnected: true,
      }
    });

    return existingCompany.id;
  }

  async getClientForCompany(companyId: string): Promise<GoCardlessClient> {
    try {
      const companyPaymentAccount = await this.prismaService.companyPaymentAccount.findFirst({
        where: { companyId, provider: 'GOCARDLESS' }
      });

      if (!companyPaymentAccount) {
        throw new BadGatewayException(`No GoCardless account found for company with ID ${companyId}.`);
      }

      return this.createClient(companyPaymentAccount.accessToken);
    } catch (error) {
      throw new BadGatewayException(`Failed to get GoCardless client for company with ID ${companyId}: ${(error as Error).message}`);
    }
  }

  async getClientForProviderAccount(providerAccountId: string): Promise<GoCardlessClient> {
    try {
      const companyPaymentAccount = await this.prismaService.companyPaymentAccount.findFirst({
        where: { providerAccountId, provider: 'GOCARDLESS' }
      });

      if (!companyPaymentAccount) {
        throw new BadGatewayException(`No GoCardless account found for provider account ID ${providerAccountId}.`);
      }

      return this.createClient(companyPaymentAccount.accessToken);
    } catch (error) {
      throw new BadGatewayException(`Failed to get GoCardless client for provider account ID ${providerAccountId}: ${(error as Error).message}`);
    }
  }

  private createClient(accessToken: string): GoCardlessClient {
    const environment = this.configService.getOrThrow('ENVIRONMENT');
    const goCardlessEnvironment = environment === "development" ? Environments.Sandbox : Environments.Live
    return new GoCardlessClient(accessToken, goCardlessEnvironment);
  }

  async verifyCompanyPaymentAccountStatus(companyPaymentAccountId: string): Promise<{
    companyId: string;
    status: $Enums.CompanyPaymentAccountVerificationStatus;
  }> {
    const companyPaymentAccount = await this.prismaService.companyPaymentAccount.findUnique({
      where: { id: companyPaymentAccountId }
    });

    if(!companyPaymentAccount){
      throw new BadGatewayException(`Aucun compte de paiment trouvé avec l'identifiant: ${companyPaymentAccountId}. Veuillez vous créer un compte Gocardless et le connecter à votre entreprise.`);
    }

    const accessToken = companyPaymentAccount.accessToken;
    const gocardlessClient = this.createClient(accessToken);
    let creditorsResponse;
    try {
      creditorsResponse = await gocardlessClient.creditors.list({ limit: '1' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erreur inconnue';
      throw new BadGatewayException(`Impossible de récupérer le statut GoCardless : ${message}`);
    }

    const creditor = creditorsResponse.creditors[0];
    if (!creditor) {
      throw new BadGatewayException('Aucun créancier GoCardless n’a été trouvé pour ce compte.');
    }
    const verificationStatus = this.gocardlessStatusMatcherService.matchPaymentAccountVerificationStatus(creditor.verification_status);

    await this.prismaService.companyPaymentAccount.update({
      where: { id: companyPaymentAccountId },
      data: {
        creditorId: creditor.id,
        verificationStatus
      }
    })

    return {
      companyId: companyPaymentAccount.companyId,
      status: verificationStatus,
    };
  }

}
