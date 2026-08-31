import type { ApiError } from '@/lib/api';

export function isGoCardlessAccessTokenInactive(error: ApiError): boolean {
  const message = Array.isArray(error.message)
    ? error.message.join(' ')
    : error.message;
  return (
    error.code === 'GOCARDLESS_ACCESS_TOKEN_INACTIVE' ||
    (error.upstreamStatusCode === 401 && /access token not active/i.test(message)) ||
    /connexion gocardless a expiré ou a été révoquée/i.test(message)
  );
}
