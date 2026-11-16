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
          electronicAddress: '0225:315143296_81589',
          electronicInvoicingConnection: { superPdpSandboxCompanyNumber: '000000001' },
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

  it('refreshes tokens without changing the identity verification status', async () => {
    const connection = {
      findUnique: jest.fn().mockResolvedValue({
        status: 'ACTIVE', environment: 'SANDBOX',
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
        accessTokenEncrypted: 'encrypted-new-access-token',
      }),
    });
    expect(connection.update.mock.calls[0][0].data).not.toHaveProperty('status');
  });

  it('never uses an electronic address or the global fallback as the sandbox identity', async () => {
    const prisma = {
      company: { findFirst: jest.fn().mockResolvedValue({
        id: 'company-1', siren: '000000002', electronicAddress: '000000002',
        electronicInvoicingConnection: null,
      }) },
      $transaction: jest.fn(),
    };
    const service = new SuperPdpOAuthService({ get: (name: string) => config[name as keyof typeof config] } as never, prisma as never, {} as never);
    await expect(service.buildAuthorizationUrl({ companyId: 'company-1', userId: 'u1' })).rejects.toThrow('numéro d’entreprise sandbox');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  describe('company identity verification', () => {
    const profile = {
      id: 42, number: '000000002', number_scheme: 'sandbox', env: 'sandbox',
      vat_regime: 'vat_exemption', has_vat_on_debits: false,
    };
    let service: SuperPdpOAuthService;
    let prisma: {
      company: { findFirst: jest.Mock; findUnique: jest.Mock };
      electronicInvoicingConnection: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    };
    let request: jest.SpyInstance;

    beforeEach(() => {
      prisma = {
        company: {
          findFirst: jest.fn().mockResolvedValue({ id: 'company-1' }),
          findUnique: jest.fn().mockResolvedValue({
            status: 'ACTIVE', siren: '123456789', subjectToVat: false,
            vatRegime: 'VAT_EXEMPTION', vatExigibility: 'UNKNOWN',
            electronicInvoicingConnection: { superPdpSandboxCompanyNumber: '000000002' },
          }),
        },
        electronicInvoicingConnection: {
          findUnique: jest.fn().mockResolvedValue({
            accessTokenEncrypted: 'encrypted-token', refreshTokenEncrypted: 'encrypted-refresh',
            accessTokenExpiresAt: new Date(Date.now() + 3600_000), status: 'VERIFYING',
            environment: 'SANDBOX', superPdpSandboxCompanyNumber: '000000002',
          }),
          update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      service = new SuperPdpOAuthService(
        { get: (name: string) => config[name as keyof typeof config] } as never,
        prisma as never, { decrypt: () => 'token' } as never,
      );
      request = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => profile } as Response);
    });
    afterEach(() => jest.restoreAllMocks());

    it('activates only the expected sandbox company', async () => {
      await expect(service.verifyConnection({ companyId: 'company-1', userId: 'u1' })).resolves.toEqual({ providerCompanyId: '42' });
      expect(prisma.electronicInvoicingConnection.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE', providerCompanyId: '42' }),
      }));
    });

    it.each([
      { number: '000000001' }, { number_scheme: 'fr_siren' }, { env: 'production' }, { number: undefined },
    ])('blocks mismatched or incomplete profiles: %j', async (difference) => {
      request.mockResolvedValue({ ok: true, json: async () => ({ ...profile, ...difference }) } as Response);
      await expect(service.verifyConnection({ companyId: 'company-1', userId: 'u1' })).rejects.toThrow('entreprise attendue');
      expect(prisma.electronicInvoicingConnection.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTION_REQUIRED' }),
      }));
      expect(prisma.electronicInvoicingConnection.updateMany).not.toHaveBeenCalled();
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('does not hand out an unverified token for invoice transmission', async () => {
      await expect(service.getAccessToken('company-1')).rejects.toThrow('Vérifiez l’identité');
      expect(request).not.toHaveBeenCalled();
    });

    it('uses the legal SIREN in production even if a sandbox number exists', async () => {
      service = new SuperPdpOAuthService(
        { get: (name: string) => name === 'SUPERPDP_ENVIRONMENT' ? 'production' : config[name as keyof typeof config] } as never,
        prisma as never, { decrypt: () => 'token' } as never,
      );
      prisma.electronicInvoicingConnection.findUnique.mockResolvedValue({
        accessTokenEncrypted: 'token', refreshTokenEncrypted: 'refresh', accessTokenExpiresAt: new Date(Date.now() + 3600_000),
        environment: 'PRODUCTION', status: 'VERIFYING', superPdpSandboxCompanyNumber: '000000002',
      });
      request.mockResolvedValue({ ok: true, json: async () => ({ ...profile, env: 'production', number_scheme: 'fr_siren', number: '123456789' }) } as Response);
      await expect(service.verifyConnection({ companyId: 'company-1', userId: 'u1' })).resolves.toEqual({ providerCompanyId: '42' });
    });

    it('cannot activate a connection changed during verification', async () => {
      prisma.electronicInvoicingConnection.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.verifyConnection({ companyId: 'company-1', userId: 'u1' })).rejects.toThrow('changé pendant');
    });

    it('lists billing endpoints of the verified company and excludes technical reply-to addresses', async () => {
      prisma.electronicInvoicingConnection.findUnique.mockResolvedValue({
        status: 'ACTIVE', environment: 'SANDBOX', accessTokenEncrypted: 'token', refreshTokenEncrypted: 'refresh',
        accessTokenExpiresAt: new Date(Date.now() + 3600_000),
      });
      request.mockResolvedValue({ ok: true, json: async () => ({ data: [
        { identifier: '0225:315143296_12345', directory: 'peppol', status: 'created', company: profile },
        { identifier: '0225:technical', directory: 'peppol', status: 'created', is_replyto: true, company: profile },
        { identifier: '0225:pending', directory: 'peppol', status: 'pending', company: profile },
        { identifier: '123456789', directory: 'ppf', status: 'created', company: profile },
      ] }) } as Response);
      await expect(service.getCompanyDirectoryEntries({ companyId: 'company-1', userId: 'u1' })).resolves.toEqual({
        data: [{ identifier: '0225:315143296_12345' }],
      });
    });

    it('refuses endpoints returned for another company', async () => {
      prisma.electronicInvoicingConnection.findUnique.mockResolvedValue({
        status: 'ACTIVE', environment: 'SANDBOX', accessTokenEncrypted: 'token', refreshTokenEncrypted: 'refresh',
        accessTokenExpiresAt: new Date(Date.now() + 3600_000),
      });
      request.mockResolvedValue({ ok: true, json: async () => ({ data: [
        { identifier: '0225:other', directory: 'peppol', status: 'created', company: { ...profile, number: '000000001' } },
      ] }) } as Response);
      await expect(service.getCompanyDirectoryEntries({ companyId: 'company-1', userId: 'u1' })).rejects.toThrow('entreprise attendue');
    });
  });

  it('invalidates the previous authorization when the sandbox identity changes', async () => {
    const connection = {
      findUnique: jest.fn().mockResolvedValue({ superPdpSandboxCompanyNumber: '000000001', environment: 'SANDBOX' }),
      upsert: jest.fn(),
    };
    const oauthState = { deleteMany: jest.fn() };
    const tx = { $queryRaw: jest.fn().mockResolvedValue([{ id: 'company-1' }]), electronicInvoicingConnection: connection, electronicInvoicingOAuthState: oauthState };
    const prisma = {
      company: { findFirst: jest.fn().mockResolvedValue({ id: 'company-1' }) },
      electronicInvoicingConnection: connection,
      $transaction: jest.fn((work: (value: typeof tx) => Promise<void>) => work(tx)),
    };
    const service = new SuperPdpOAuthService({ get: (name: string) => config[name as keyof typeof config] } as never, prisma as never, {} as never);
    await service.configureSandboxCompany({ companyId: 'company-1', userId: 'u1', superPdpSandboxCompanyNumber: '000000002' });
    expect(connection.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ status: 'NOT_CONFIGURED', superPdpSandboxCompanyNumber: '000000002', accessTokenEncrypted: null, refreshTokenEncrypted: null }),
    }));
    expect(oauthState.deleteMany).toHaveBeenCalledWith({ where: { companyId: 'company-1' } });
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
