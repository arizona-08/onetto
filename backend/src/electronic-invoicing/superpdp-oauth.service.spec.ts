import { SuperPdpOAuthService } from './superpdp-oauth.service';

describe('SuperPdpOAuthService', () => {
  const config = {
    SUPERPDP_ONBOARDING_ENABLED: 'true',
    SUPERPDP_CLIENT_ID: 'client-id',
    SUPERPDP_CLIENT_SECRET: 'client-secret',
    SUPERPDP_OAUTH_REDIRECT_URL: 'https://onetto.test/oauth/callback',
    SUPERPDP_ENVIRONMENT: 'sandbox',
    SUPERPDP_SANDBOX_COMPANY_NUMBER: '000000002',
  };

  it('builds the documented authorization-code URL after authorizing the company', async () => {
    const oauthState = {
      deleteMany: jest.fn(),
      create: jest.fn(),
    };
    const connection = { upsert: jest.fn() };
    const prisma = {
      company: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'company-1',
          email: 'owner@example.test',
          siren: '123456789',
        }),
      },
      $transaction: jest.fn(
        async (callback: (transaction: unknown) => Promise<void>) =>
          callback({
            electronicInvoicingOAuthState: oauthState,
            electronicInvoicingConnection: connection,
          }),
      ),
    };
    const service = new SuperPdpOAuthService(
      { get: jest.fn((name: string) => config[name as keyof typeof config]) } as never,
      prisma as never,
      {} as never,
    );

    const { url } = await service.buildAuthorizationUrl({
      companyId: 'company-1',
      userId: 'user-1',
    });
    const authorizationUrl = new URL(url);

    expect(authorizationUrl.origin).toBe('https://api.superpdp.tech');
    expect(authorizationUrl.pathname).toBe('/oauth2/authorize');
    expect(authorizationUrl.searchParams.get('response_type')).toBe('code');
    expect(authorizationUrl.searchParams.get('client_id')).toBe('client-id');
    expect(authorizationUrl.searchParams.get('scope')).toBeNull();
    expect(authorizationUrl.searchParams.get('superpdp_company_number')).toBe(
      '000000002',
    );
    expect(authorizationUrl.searchParams.get('superpdp_company_number_scheme')).toBe(
      'sandbox',
    );
    expect(oauthState.create).toHaveBeenCalledTimes(1);
    expect(connection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'PENDING_AUTHORIZATION' }),
      }),
    );
  });
});
