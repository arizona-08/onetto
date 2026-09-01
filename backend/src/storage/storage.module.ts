import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FacturXArchiveMigrationService } from './factur-x-archive-migration.service';
import { S3StorageService } from './s3-storage.service';

@Module({
  imports: [PrismaModule],
  providers: [S3StorageService, FacturXArchiveMigrationService],
  exports: [S3StorageService, FacturXArchiveMigrationService],
})
export class StorageModule {}
