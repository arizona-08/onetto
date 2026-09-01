import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3StorageService } from './s3-storage.service';

@Injectable()
export class FacturXArchiveMigrationService {
  private readonly logger = new Logger(FacturXArchiveMigrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: S3StorageService,
  ) {}

  async migrateLegacyFacturX(): Promise<{ migrated: number }> {
    let migrated = 0;

    while (true) {
      const documents = await this.prisma.document.findMany({
        where: { facturXContent: { not: null }, facturXArchiveKey: null },
        select: { id: true, companyId: true, facturXContent: true },
        orderBy: { id: 'asc' },
        take: 25,
      });
      if (!documents.length) break;

      for (const document of documents) {
        if (!document.facturXContent) continue;
        const archived = await this.storage.archiveFacturX({
          companyId: document.companyId,
          documentId: document.id,
          content: Buffer.from(document.facturXContent),
        });
        await this.prisma.document.update({
          where: { id: document.id },
          data: {
            facturXArchiveKey: archived.key,
            facturXContentSha256: archived.sha256,
            facturXArchiveVersion: archived.objectVersionId,
            facturXEvidenceKey: archived.evidenceKey,
            facturXArchivedAt: archived.archivedAt,
            facturXContent: null,
          },
        });
        migrated += 1;
        this.logger.log(`Factur-X ${document.id} migré vers l’archive S3.`);
      }
    }

    return { migrated };
  }
}
