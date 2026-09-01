import { readFile } from 'node:fs/promises';
import { ConfigService } from '@nestjs/config';
import { parse } from 'dotenv';
import { FacturXArchiveMigrationService } from 'src/storage/factur-x-archive-migration.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3StorageService } from 'src/storage/s3-storage.service';

async function run() {
  // This is intentionally a small standalone command, rather than a Nest
  // application context: it should open exactly one database connection and
  // not start HTTP, schedulers, or any provider unrelated to the migration.
  const prisma = new PrismaService();
  // Parse the file explicitly: ConfigService receives the intended values
  // even if Docker still has an older environment variable injected.
  const environment = parse(await readFile('.env'));
  const config = new ConfigService(environment);
  const migration = new FacturXArchiveMigrationService(prisma, new S3StorageService(config));
  try {
    await prisma.$connect();
    const result = await migration.migrateLegacyFacturX();
    console.log(`Migration Factur-X terminée : ${result.migrated} document(s) migré(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

void run().catch((error) => {
  console.error('Migration Factur-X interrompue.', error);
  process.exitCode = 1;
});
