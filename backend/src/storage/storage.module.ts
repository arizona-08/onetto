import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FacturXArchiveMigrationService } from './factur-x-archive-migration.service';
import { S3StorageService } from './s3-storage.service';
import { ArchiveController } from './archive.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  providers: [S3StorageService, FacturXArchiveMigrationService],
  controllers: [ArchiveController],
  exports: [S3StorageService, FacturXArchiveMigrationService],
})
export class StorageModule {}
