import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import { Environments, GoCardlessClient } from "gocardless-nodejs";
import { PrismaService } from "src/prisma/prisma.service";

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
    private readonly prismaService: PrismaService
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

  async connectCompanyWithGoCardless(authorizationCode: string, state: string): Promise<void> {
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
    console.log("Received access token response from GoCardless:", accessTokenResponse);
    await this.prismaService.companyPaymentAccount.create({
      data: {
        companyId: existingCompany.id,
        provider: 'GOCARDLESS',
        providerAccountId: accessTokenResponse.organisation_id,
        accessToken: accessTokenResponse.access_token,
      }
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
  }

  private createClient(accessToken: string): GoCardlessClient {
    const environment = this.configService.getOrThrow('ENVIRONMENT');
    const goCardlessEnvironment = environment === "development" ? Environments.Sandbox : Environments.Live
    return new GoCardlessClient(accessToken, goCardlessEnvironment);
  }

}