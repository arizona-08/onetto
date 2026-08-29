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
});
