import { SuperPdpTokenCryptoService } from './superpdp-token-crypto.service';

describe('SuperPdpTokenCryptoService', () => {
  const key = Buffer.alloc(32, 7).toString('base64');

  it('encrypts tokens without preserving their plaintext', () => {
    const service = new SuperPdpTokenCryptoService({
      get: jest.fn().mockReturnValue(key),
    } as never);

    const encrypted = service.encrypt('superpdp-access-token');

    expect(encrypted).not.toContain('superpdp-access-token');
    expect(service.decrypt(encrypted)).toBe('superpdp-access-token');
  });

  it('rejects a malformed encrypted token', () => {
    const service = new SuperPdpTokenCryptoService({
      get: jest.fn().mockReturnValue(key),
    } as never);

    expect(() => service.decrypt('not-a-token')).toThrow(
      'Le jeton SuperPDP stocké est invalide.',
    );
  });
});
