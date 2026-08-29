import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class SuperPdpTokenCryptoService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(value: string): string {
    const key = this.getKey();
    const initializationVector = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, initializationVector);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [
      initializationVector.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string): string {
    const [initializationVector, tag, encrypted, extra] = value.split('.');
    if (!initializationVector || !tag || !encrypted || extra) {
      throw new InternalServerErrorException(
        'Le jeton SuperPDP stocké est invalide.',
      );
    }

    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.getKey(),
        Buffer.from(initializationVector, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new InternalServerErrorException(
        'Le jeton SuperPDP stocké ne peut pas être déchiffré.',
      );
    }
  }

  private getKey(): Buffer {
    const configuredKey = this.configService.get<string>(
      'SUPERPDP_TOKEN_ENCRYPTION_KEY',
    );
    if (!configuredKey) {
      throw new InternalServerErrorException(
        'La clé de chiffrement SuperPDP est absente.',
      );
    }

    const key = Buffer.from(configuredKey, 'base64');
    if (key.length !== 32) {
      throw new InternalServerErrorException(
        'La clé de chiffrement SuperPDP doit contenir exactement 32 octets encodés en base64.',
      );
    }
    return key;
  }
}
