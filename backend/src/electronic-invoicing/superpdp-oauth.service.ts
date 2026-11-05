import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthorizationCode } from 'simple-oauth2';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SuperPdpTokenCryptoService } from './superpdp-token-crypto.service';

type SuperPdpToken = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string | Date;
};

type SuperPdpCompanyProfile = {
  id?: number | string;
  status?: string;
  directory_registration_status?: string;
  vat_regime?: string | null;
  has_vat_on_debits?: boolean;
  [key: string]: unknown;
};

@Injectable()
export class SuperPdpOAuthService {
  private readonly authorizationEndpoint =
    'https://api.superpdp.tech/oauth2/authorize';
  private readonly tokenEndpoint = 'https://api.superpdp.tech/oauth2/token';

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly tokenCryptoService: SuperPdpTokenCryptoService,
  ) {}

  async buildAuthorizationUrl(input: { companyId: string; userId: string }) {
    this.assertOnboardingIsEnabled();
    const company = await this.prismaService.company.findFirst({
      where: {
        id: input.companyId,
        status: 'ACTIVE',
        OR: [
          { ownerId: input.userId },
          {
            companyUsers: {
              some: { userId: input.userId, role: 'ADMIN', isHidden: false },
            },
          },
        ],
      },
      select: { id: true, email: true, siren: true, electronicAddress: true },
    });
    if (!company) {
      throw new NotFoundException(
        'Entreprise introuvable ou accès non autorisé.',
      );
    }

    const state = randomBytes(32).toString('base64url');
    await this.prismaService.$transaction(async (prisma) => {
      await prisma.electronicInvoicingOAuthState.deleteMany({
        where: { companyId: company.id, expiresAt: { lt: new Date() } },
      });
      await prisma.electronicInvoicingOAuthState.create({
        data: {
          companyId: company.id,
          state,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      await prisma.electronicInvoicingConnection.upsert({
        where: { companyId: company.id },
        create: {
          companyId: company.id,
          provider: 'SUPER_PDP',
          environment: this.getEnvironment(),
          status: 'PENDING_AUTHORIZATION',
        },
        update: { status: 'PENDING_AUTHORIZATION', lastError: null },
      });
    });

    const url = new URL(this.authorizationEndpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set(
      'client_id',
      this.getRequiredConfig('SUPERPDP_CLIENT_ID'),
    );
    url.searchParams.set(
      'redirect_uri',
      this.getRequiredConfig('SUPERPDP_OAUTH_REDIRECT_URL'),
    );
    url.searchParams.set('state', state);
    url.searchParams.set('login_hint', company.email);
    const companyHint = this.getCompanyHint(
      company.siren,
      company.electronicAddress,
    );
    url.searchParams.set('superpdp_company_number', companyHint.number);
    url.searchParams.set('superpdp_company_number_scheme', companyHint.scheme);
    url.searchParams.set('superpdp_send_and_receive', 'any');
    url.searchParams.set('superpdp_only_future', 'true');

    return { url: url.toString() };
  }

  async completeAuthorization(input: {
    code?: string;
    state?: string;
    error?: string;
  }) {
    this.assertOnboardingIsEnabled();
    if (input.error) {
      throw new BadRequestException(
        'La connexion SuperPDP a été annulée ou refusée.',
      );
    }
    if (!input.code || !input.state) {
      throw new BadRequestException('Réponse OAuth SuperPDP invalide.');
    }

    const oauthState =
      await this.prismaService.electronicInvoicingOAuthState.findUnique({
        where: { state: input.state },
      });
    if (!oauthState || oauthState.expiresAt < new Date()) {
      throw new BadRequestException('État OAuth SuperPDP invalide ou expiré.');
    }
    const company = await this.prismaService.company.findUnique({
      where: { id: oauthState.companyId },
      select: { status: true },
    });
    if (company?.status !== 'ACTIVE')
      throw new BadRequestException('Entreprise fermée.');

    const token = await this.exchangeCode(input.code);
    if (!token.access_token || !token.refresh_token || !token.expires_at) {
      throw new BadGatewayException(
        'SuperPDP a retourné une réponse OAuth incomplète.',
      );
    }
    const expiresAt = new Date(token.expires_at);
    if (Number.isNaN(expiresAt.valueOf())) {
      throw new BadGatewayException(
        'SuperPDP a retourné une date d’expiration invalide.',
      );
    }

    try {
      await this.prismaService.$transaction(async (prisma) => {
        const currentCompany = await prisma.company.findUnique({
          where: { id: oauthState.companyId },
          select: { status: true },
        });
        if (currentCompany?.status !== 'ACTIVE') {
          throw new BadRequestException('Cette entreprise est fermée.');
        }
        await prisma.electronicInvoicingConnection.upsert({
          where: { companyId: oauthState.companyId },
          create: {
            companyId: oauthState.companyId,
            provider: 'SUPER_PDP',
            environment: this.getEnvironment(),
            status: 'VERIFYING',
            accessTokenEncrypted: this.tokenCryptoService.encrypt(
              token.access_token!,
            ),
            refreshTokenEncrypted: this.tokenCryptoService.encrypt(
              token.refresh_token!,
            ),
            accessTokenExpiresAt: expiresAt,
            connectedAt: new Date(),
          },
          update: {
            environment: this.getEnvironment(),
            status: 'VERIFYING',
            accessTokenEncrypted: this.tokenCryptoService.encrypt(
              token.access_token!,
            ),
            refreshTokenEncrypted: this.tokenCryptoService.encrypt(
              token.refresh_token!,
            ),
            accessTokenExpiresAt: expiresAt,
            connectedAt: new Date(),
            lastError: null,
          },
        });
        await prisma.electronicInvoicingOAuthState.delete({
          where: { id: oauthState.id },
        });
      });
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw error;
    }

    // OAuth is sufficient to confirm the connection synchronously. Webhooks
    // are only needed later for invoice and reporting lifecycle events.
    await this.syncProviderConnection(oauthState.companyId).catch(
      () => undefined,
    );
    return { companyId: oauthState.companyId };
  }

  /**
   * Returns a usable bearer token. SuperPDP rotates refresh tokens, therefore
   * both tokens are persisted together whenever a refresh succeeds.
   */
  async getAccessToken(companyId: string): Promise<string> {
    const connection =
      await this.prismaService.electronicInvoicingConnection.findUnique({
        where: { companyId },
        select: {
          accessTokenEncrypted: true,
          refreshTokenEncrypted: true,
          accessTokenExpiresAt: true,
        },
      });
    if (
      !connection?.accessTokenEncrypted ||
      !connection.refreshTokenEncrypted
    ) {
      throw new BadRequestException(
        'Cette entreprise n’est pas connectée à SuperPDP.',
      );
    }

    const expiresSoon =
      !connection.accessTokenExpiresAt ||
      connection.accessTokenExpiresAt.getTime() <= Date.now() + 60_000;
    if (!expiresSoon) {
      return this.tokenCryptoService.decrypt(connection.accessTokenEncrypted);
    }

    try {
      const refreshed = await this.getClient()
        .createToken({
          refresh_token: this.tokenCryptoService.decrypt(
            connection.refreshTokenEncrypted,
          ),
        })
        .refresh();
      const token = refreshed.token as SuperPdpToken;
      if (!token.access_token || !token.refresh_token || !token.expires_at) {
        throw new Error('Incomplete token response');
      }
      const expiresAt = new Date(token.expires_at);
      if (Number.isNaN(expiresAt.valueOf())) {
        throw new Error('Invalid expiration date');
      }
      await this.prismaService.electronicInvoicingConnection.update({
        where: { companyId },
        data: {
          accessTokenEncrypted: this.tokenCryptoService.encrypt(
            token.access_token,
          ),
          refreshTokenEncrypted: this.tokenCryptoService.encrypt(
            token.refresh_token,
          ),
          accessTokenExpiresAt: expiresAt,
          status: 'ACTIVE',
          lastSyncedAt: new Date(),
          lastError: null,
        },
      });
      return token.access_token;
    } catch {
      await this.prismaService.electronicInvoicingConnection.update({
        where: { companyId },
        data: {
          status: 'ACTION_REQUIRED',
          lastError: 'Le jeton SuperPDP ne peut pas être renouvelé.',
        },
      });
      throw new BadGatewayException(
        'La connexion SuperPDP doit être autorisée de nouveau.',
      );
    }
  }

  async verifyConnection(input: { companyId: string; userId: string }) {
    await this.findAccessibleCompany(input);
    return this.syncProviderConnection(input.companyId);
  }

  private async syncProviderConnection(companyId: string) {
    const token = await this.getAccessToken(companyId);
    let profile: SuperPdpCompanyProfile;
    try {
      const response = await fetch(
        'https://api.superpdp.tech/v1.beta/companies/me',
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      profile = (await response.json()) as SuperPdpCompanyProfile;
    } catch {
      await this.prismaService.electronicInvoicingConnection.update({
        where: { companyId },
        data: {
          status: 'ACTION_REQUIRED',
          lastError: 'Impossible de vérifier le compte SuperPDP connecté.',
        },
      });
      throw new BadGatewayException(
        'Impossible de vérifier le compte SuperPDP.',
      );
    }

    try {
      profile = await this.ensureCompanyVatRegime(companyId, token, profile);
    } catch (error) {
      await this.prismaService.electronicInvoicingConnection.update({
        where: { companyId },
        data: {
          status: 'ACTION_REQUIRED',
          lastError:
            error instanceof Error
              ? error.message
              : 'Régime de TVA SuperPDP à vérifier.',
        },
      });
      throw error;
    }

    await this.prismaService.electronicInvoicingConnection.update({
      where: { companyId },
      data: {
        status: 'ACTIVE',
        providerCompanyId: profile.id === undefined ? null : String(profile.id),
        metadata: profile as Prisma.InputJsonValue,
        lastSyncedAt: new Date(),
        lastError: null,
      },
    });
    return {
      providerCompanyId: profile.id === undefined ? null : String(profile.id),
    };
  }

  /** SuperPDP requires a VAT regime on the company before accepting e-reporting. */
  async ensureCompanyVatRegime(
    companyId: string,
    token: string,
    knownProfile?: SuperPdpCompanyProfile,
  ): Promise<SuperPdpCompanyProfile> {
    const company = await this.prismaService.company.findUnique({
      where: { id: companyId },
      select: {
        status: true,
        subjectToVat: true,
        vatRegime: true,
        vatExigibility: true,
        electronicInvoicingConnection: { select: { providerCompanyId: true } },
      },
    });
    if (!company || company.status !== 'ACTIVE') {
      throw new BadRequestException('Entreprise introuvable ou fermée.');
    }
    if (
      (company.subjectToVat && company.vatRegime === 'VAT_EXEMPTION') ||
      (!company.subjectToVat && company.vatRegime !== 'VAT_EXEMPTION') ||
      (company.subjectToVat && company.vatExigibility === 'UNKNOWN')
    ) {
      throw new BadRequestException(
        'Vérifiez le régime et l’exigibilité de la TVA dans les paramètres de l’entreprise avant l’e-reporting.',
      );
    }
    const profile = knownProfile ?? (await this.fetchCompanyProfile(token));
    if (
      company.electronicInvoicingConnection?.providerCompanyId &&
      String(profile.id) !==
        company.electronicInvoicingConnection.providerCompanyId
    ) {
      throw new BadGatewayException(
        'Le compte SuperPDP connecté ne correspond plus à cette entreprise.',
      );
    }
    const vatRegime = company.vatRegime.toLowerCase();
    const hasVatOnDebits = company.vatExigibility === 'ON_DEBITS';
    if (
      profile.vat_regime === vatRegime &&
      profile.has_vat_on_debits === hasVatOnDebits
    ) {
      return profile;
    }
    let response: Response;
    try {
      response = await fetch('https://api.superpdp.tech/v1.beta/companies', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vat_regime: vatRegime,
          has_vat_on_debits: hasVatOnDebits,
        }),
      });
    } catch {
      throw new BadGatewayException(
        'Impossible de synchroniser le régime de TVA avec SuperPDP.',
      );
    }
    if (!response.ok) {
      throw new BadGatewayException(
        `SuperPDP a refusé la configuration du régime de TVA (${response.status}).`,
      );
    }
    const updated = (await response.json()) as SuperPdpCompanyProfile;
    if (
      updated.vat_regime !== vatRegime ||
      updated.has_vat_on_debits !== hasVatOnDebits
    ) {
      throw new BadGatewayException(
        'SuperPDP n’a pas confirmé le régime de TVA demandé.',
      );
    }
    return { ...profile, ...updated };
  }

  private async fetchCompanyProfile(
    token: string,
  ): Promise<SuperPdpCompanyProfile> {
    try {
      const response = await fetch(
        'https://api.superpdp.tech/v1.beta/companies/me',
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as SuperPdpCompanyProfile;
    } catch {
      throw new BadGatewayException(
        'Impossible de vérifier le régime de TVA du compte SuperPDP.',
      );
    }
  }

  async getConnectionStatus(input: { companyId: string; userId: string }) {
    await this.findAccessibleCompany(input);
    return this.prismaService.electronicInvoicingConnection.findUnique({
      where: { companyId: input.companyId },
      select: {
        provider: true,
        environment: true,
        status: true,
        directoryRegistrationStatus: true,
        providerCompanyId: true,
        connectedAt: true,
        lastSyncedAt: true,
        lastError: true,
      },
    });
  }

  private async exchangeCode(code: string): Promise<SuperPdpToken> {
    try {
      const result = await this.getClient().getToken({
        code,
        redirect_uri: this.getRequiredConfig('SUPERPDP_OAUTH_REDIRECT_URL'),
      });
      return result.token as SuperPdpToken;
    } catch {
      throw new BadGatewayException(
        'Impossible de finaliser la connexion avec SuperPDP.',
      );
    }
  }

  private getClient(): AuthorizationCode {
    return new AuthorizationCode({
      client: {
        id: this.getRequiredConfig('SUPERPDP_CLIENT_ID'),
        secret: this.getRequiredConfig('SUPERPDP_CLIENT_SECRET'),
      },
      auth: {
        tokenHost: 'https://api.superpdp.tech',
        tokenPath: '/oauth2/token',
        authorizePath: '/oauth2/authorize',
      },
    });
  }

  private async findAccessibleCompany(input: {
    companyId: string;
    userId: string;
  }) {
    const company = await this.prismaService.company.findFirst({
      where: {
        id: input.companyId,
        status: 'ACTIVE',
        OR: [
          { ownerId: input.userId },
          {
            companyUsers: {
              some: { userId: input.userId, role: 'ADMIN', isHidden: false },
            },
          },
        ],
      },
      select: { id: true },
    });
    if (!company) {
      throw new NotFoundException(
        'Entreprise introuvable ou accès non autorisé.',
      );
    }
    return company;
  }

  private getEnvironment(): 'SANDBOX' | 'PRODUCTION' {
    return this.configService.get<string>('SUPERPDP_ENVIRONMENT') ===
      'production'
      ? 'PRODUCTION'
      : 'SANDBOX';
  }

  private getCompanyHint(
    localSiren: string,
    electronicAddress?: string | null,
  ): {
    number: string;
    scheme: 'sandbox' | 'fr_siren';
  } {
    if (this.getEnvironment() === 'SANDBOX') {
      return {
        // SuperPDP sandbox companies use their own sandbox number.  Keeping it
        // on the Onetto company lets one OAuth application connect both Burger
        // Queen (000000002) and Tricatel (000000001), for example.
        number:
          electronicAddress?.trim() ||
          this.getRequiredConfig('SUPERPDP_SANDBOX_COMPANY_NUMBER'),
        scheme: 'sandbox',
      };
    }
    return { number: localSiren, scheme: 'fr_siren' };
  }

  private assertOnboardingIsEnabled(): void {
    if (
      this.configService.get<string>('SUPERPDP_ONBOARDING_ENABLED') !== 'true'
    ) {
      throw new BadRequestException(
        'La connexion SuperPDP n’est pas activée dans cet environnement.',
      );
    }
  }

  private getRequiredConfig(name: string): string {
    const value = this.configService.get<string>(name);
    if (!value) {
      throw new BadRequestException(
        `La configuration requise ${name} est absente.`,
      );
    }
    return value;
  }
}
