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
          electronicAddress: '000000001',
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
      {
        get: jest.fn((name: string) => config[name as keyof typeof config]),
      } as never,
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
      '000000001',
    );
    expect(
      authorizationUrl.searchParams.get('superpdp_company_number_scheme'),
    ).toBe('sandbox');
    expect(oauthState.create).toHaveBeenCalledTimes(1);
    expect(connection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'PENDING_AUTHORIZATION' }),
      }),
    );
  });

  it('restores an active connection after a successful token refresh', async () => {
    const connection = {
      findUnique: jest.fn().mockResolvedValue({
        accessTokenEncrypted: 'encrypted-access-token',
        refreshTokenEncrypted: 'encrypted-refresh-token',
        accessTokenExpiresAt: new Date(Date.now() - 60_000),
      }),
      update: jest.fn(),
    };
    const tokenCrypto = {
      decrypt: jest.fn((value: string) => value.replace('encrypted-', '')),
      encrypt: jest.fn((value: string) => `encrypted-${value}`),
    };
    const service = new SuperPdpOAuthService(
      {
        get: jest.fn((name: string) => config[name as keyof typeof config]),
      } as never,
      { electronicInvoicingConnection: connection } as never,
      tokenCrypto as never,
    );
    jest.spyOn(service as never, 'getClient').mockReturnValue({
      createToken: jest.fn().mockReturnValue({
        refresh: jest.fn().mockResolvedValue({
          token: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          },
        }),
      }),
    });

    await expect(service.getAccessToken('company-1')).resolves.toBe(
      'new-access-token',
    );
    expect(connection.update).toHaveBeenCalledWith({
      where: { companyId: 'company-1' },
      data: expect.objectContaining({
        status: 'ACTIVE',
        lastError: null,
      }),
    });
  });

  it('configures the company VAT regime at SuperPDP before e-reporting', async () => {
    const prisma = {
      company: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'ACTIVE',
          subjectToVat: true,
          vatRegime: 'MONTHLY',
          vatExigibility: 'ON_COLLECTION',
          electronicInvoicingConnection: { providerCompanyId: '42' },
        }),
      },
    };
    const service = new SuperPdpOAuthService(
      {} as never,
      prisma as never,
      {} as never,
    );
    const request = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 42,
            vat_regime: null,
            has_vat_on_debits: false,
          }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 42,
            vat_regime: 'monthly',
            has_vat_on_debits: false,
          }),
      } as never);

    await expect(
      service.ensureCompanyVatRegime('company-1', 'sandbox-token'),
    ).resolves.toMatchObject({ vat_regime: 'monthly' });
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0]).toBe(
      'https://api.superpdp.tech/v1.beta/companies',
    );
    expect(request.mock.calls[1][1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ vat_regime: 'monthly', has_vat_on_debits: false }),
    });
    request.mockRestore();
  });

  it('does not overwrite an unconfirmed local VAT setup', async () => {
    const service = new SuperPdpOAuthService(
      {} as never,
      {
        company: {
          findUnique: jest.fn().mockResolvedValue({
            status: 'ACTIVE',
            subjectToVat: true,
            vatRegime: 'VAT_EXEMPTION',
            vatExigibility: 'UNKNOWN',
          }),
        },
      } as never,
      {} as never,
    );
    const request = jest.spyOn(global, 'fetch');

    await expect(
      service.ensureCompanyVatRegime('company-1', 'sandbox-token'),
    ).rejects.toThrow('Vérifiez le régime');
    expect(request).not.toHaveBeenCalled();
    request.mockRestore();
  });

  it('keeps a matching SuperPDP VAT profile unchanged', async () => {
    const service = new SuperPdpOAuthService(
      {} as never,
      {
        company: {
          findUnique: jest.fn().mockResolvedValue({
            status: 'ACTIVE',
            subjectToVat: true,
            vatRegime: 'QUARTERLY',
            vatExigibility: 'ON_DEBITS',
            electronicInvoicingConnection: { providerCompanyId: '42' },
          }),
        },
      } as never,
      {} as never,
    );
    const request = jest.spyOn(global, 'fetch');
    await expect(
      service.ensureCompanyVatRegime('company-1', 'sandbox-token', {
        id: 42,
        vat_regime: 'quarterly',
        has_vat_on_debits: true,
      }),
    ).resolves.toMatchObject({ vat_regime: 'quarterly' });
    expect(request).not.toHaveBeenCalled();
    request.mockRestore();
  });
});
