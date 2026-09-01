import {
  GetObjectCommand,
  HeadObjectCommand,
  ObjectLockMode,
  PutObjectCommand,
  S3Client,
  ServerSideEncryption,
} from '@aws-sdk/client-s3';
import { BadGatewayException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

type ArchiveFacturXInput = {
  companyId: string;
  documentId: string;
  content: Buffer;
};

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly archiveBucket: string;
  private readonly archiveKmsKeyId: string;
  private readonly retentionMode: ObjectLockMode;
  private readonly retentionDays: number;

  constructor(private readonly config: ConfigService) {
    const region = this.required('AWS_REGION');
    this.archiveBucket = this.required('S3_ARCHIVE_BUCKET');
    this.archiveKmsKeyId = this.required('S3_ARCHIVE_KMS_KEY_ID');
    this.retentionMode = this.parseRetentionMode(this.required('S3_ARCHIVE_RETENTION_MODE'));
    this.retentionDays = this.parseRetentionDays(this.required('S3_ARCHIVE_RETENTION_DAYS'));
    this.client = new S3Client({ region });
  }

  async archiveFacturX(input: ArchiveFacturXInput) {
    const sha256 = this.sha256(input.content);
    const key = `companies/${input.companyId}/documents/${input.documentId}/factur-x/${sha256}.pdf`;
    const retainUntil = new Date(Date.now() + this.retentionDays * 24 * 60 * 60 * 1000);
    let operation = 'vérification de l’archive existante';

    try {
      // A deterministic key makes retries safe: after an upload succeeded but
      // before the DB transaction completed, rerunning the migration must not
      // create another retained object version.
      const existing = await this.existingArchiveMatches(key, sha256);
      if (existing) return { key, sha256, archivedAt: existing };

      operation = 'écriture de l’objet avec chiffrement KMS et rétention Object Lock';
      await this.client.send(new PutObjectCommand({
        Bucket: this.archiveBucket,
        Key: key,
        Body: input.content,
        ContentType: 'application/pdf',
        ServerSideEncryption: ServerSideEncryption.aws_kms,
        SSEKMSKeyId: this.archiveKmsKeyId,
        ChecksumSHA256: Buffer.from(sha256, 'hex').toString('base64'),
        Metadata: {
          companyid: input.companyId,
          documentid: input.documentId,
          sha256,
          archivedat: new Date().toISOString(),
        },
        ObjectLockMode: this.retentionMode,
        ObjectLockRetainUntilDate: retainUntil,
      }));

      operation = 'relecture et vérification de l’objet archivé';
      await this.verifyArchivedFacturX(key, sha256);
      return { key, sha256, archivedAt: new Date() };
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      const awsError = error as {
        name?: string;
        message?: string;
        Code?: string;
        $metadata?: { httpStatusCode?: number; requestId?: string };
      };
      console.error('[S3 archive Factur-X] Échec AWS', {
        operation,
        name: awsError.name,
        code: awsError.Code,
        message: awsError.message,
        httpStatusCode: awsError.$metadata?.httpStatusCode,
        requestId: awsError.$metadata?.requestId,
      });
      throw new BadGatewayException(
        'Impossible de stocker la facture Factur-X dans l’archive sécurisée.',
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  async getArchivedFacturX(key: string, expectedSha256?: string | null): Promise<Buffer> {
    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.archiveBucket,
        Key: key,
      }));
      if (!response.Body) throw new InternalServerErrorException('L’archive S3 ne contient aucun fichier.');
      const content = Buffer.from(await response.Body.transformToByteArray());
      const actualSha256 = this.sha256(content);
      if (expectedSha256 && actualSha256 !== expectedSha256) {
        throw new InternalServerErrorException('Le hash de l’archive Factur-X ne correspond pas au document attendu.');
      }
      return content;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new BadGatewayException(
        'Impossible de lire la facture Factur-X depuis l’archive sécurisée.',
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  private async verifyArchivedFacturX(key: string, expectedSha256: string) {
    const head = await this.client.send(new HeadObjectCommand({
      Bucket: this.archiveBucket,
      Key: key,
      ChecksumMode: 'ENABLED',
    }));
    if (head.Metadata?.sha256 !== expectedSha256) {
      throw new InternalServerErrorException('La vérification du hash S3 de la facture Factur-X a échoué.');
    }

    const stored = await this.getArchivedFacturX(key, expectedSha256);
    if (this.sha256(stored) !== expectedSha256) {
      throw new InternalServerErrorException('La vérification du contenu S3 de la facture Factur-X a échoué.');
    }
  }

  private async existingArchiveMatches(key: string, expectedSha256: string): Promise<Date | null> {
    try {
      const head = await this.client.send(new HeadObjectCommand({
        Bucket: this.archiveBucket,
        Key: key,
      }));
      if (head.Metadata?.sha256 !== expectedSha256) {
        throw new InternalServerErrorException('Une archive S3 existante ne correspond pas au contenu Factur-X attendu.');
      }
      await this.verifyArchivedFacturX(key, expectedSha256);
      return head.LastModified ?? new Date();
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
      if (status === 404) return null;
      throw error;
    }
  }

  private sha256(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private required(name: string): string {
    const value = this.config.get<string>(name);
    if (!value) throw new Error(`La variable d’environnement ${name} est requise pour l’archivage S3.`);
    return value;
  }

  private parseRetentionMode(value: string): ObjectLockMode {
    if (value === 'GOVERNANCE') return ObjectLockMode.GOVERNANCE;
    if (value === 'COMPLIANCE') return ObjectLockMode.COMPLIANCE;
    throw new Error('S3_ARCHIVE_RETENTION_MODE doit être GOVERNANCE ou COMPLIANCE.');
  }

  private parseRetentionDays(value: string): number {
    const days = Number(value);
    if (!Number.isInteger(days) || days <= 0) {
      throw new Error('S3_ARCHIVE_RETENTION_DAYS doit être un entier positif.');
    }
    return days;
  }
}
