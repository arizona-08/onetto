type Environment = Record<string, string | undefined>;

const featureFlags = [
  'SUPERPDP_ONBOARDING_ENABLED',
  'SUPERPDP_ISSUANCE_ENABLED',
  'SUPERPDP_RECEIPT_ENABLED',
  'SUPERPDP_TRANSACTION_EREPORTING_ENABLED',
  'SUPERPDP_PAYMENT_EREPORTING_ENABLED',
] as const;

export function validateSuperPdpConfiguration(env: Environment): Environment {
  const environment = env.SUPERPDP_ENVIRONMENT ?? 'sandbox';
  if (!['sandbox', 'production'].includes(environment)) {
    throw new Error('SUPERPDP_ENVIRONMENT doit être « sandbox » ou « production ».');
  }

  const enabledFeatures = featureFlags.filter(
    (name) => env[name] === 'true',
  );
  if (enabledFeatures.length === 0) {
    return env;
  }

  const required = [
    'SUPERPDP_CLIENT_ID',
    'SUPERPDP_CLIENT_SECRET',
    'SUPERPDP_OAUTH_REDIRECT_URL',
    'SUPERPDP_TOKEN_ENCRYPTION_KEY',
  ];
  const missing = required.filter((name) => !env[name]);
  if (environment === 'sandbox' && !env.SUPERPDP_SANDBOX_COMPANY_NUMBER) {
    missing.push('SUPERPDP_SANDBOX_COMPANY_NUMBER');
  }
  if (missing.length > 0) {
    throw new Error(
      `Configuration SuperPDP incomplète : ${missing.join(', ')}.`,
    );
  }
  return env;
}
