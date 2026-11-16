import { validateSuperPdpConfiguration } from './superpdp.config';

describe('validateSuperPdpConfiguration', () => {
  it('keeps all SuperPDP capabilities disabled without credentials', () => {
    expect(validateSuperPdpConfiguration({})).toEqual({});
  });

  it('rejects enabled SuperPDP capabilities without their secrets', () => {
    expect(() =>
      validateSuperPdpConfiguration({ SUPERPDP_ONBOARDING_ENABLED: 'true' }),
    ).toThrow('Configuration SuperPDP incomplète');
  });

  it('rejects an unsupported environment', () => {
    expect(() =>
      validateSuperPdpConfiguration({ SUPERPDP_ENVIRONMENT: 'test' }),
    ).toThrow('SUPERPDP_ENVIRONMENT doit être');
  });

  it('does not require a global sandbox company when OAuth credentials are configured', () => {
    const configured = {
      SUPERPDP_ONBOARDING_ENABLED: 'true', SUPERPDP_ENVIRONMENT: 'sandbox',
      SUPERPDP_CLIENT_ID: 'client', SUPERPDP_CLIENT_SECRET: 'secret',
      SUPERPDP_OAUTH_REDIRECT_URL: 'https://onetto.test/callback', SUPERPDP_TOKEN_ENCRYPTION_KEY: 'key',
    };
    expect(validateSuperPdpConfiguration(configured)).toBe(configured);
  });
});
