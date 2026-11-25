import { readFile } from 'node:fs/promises';
import { ConfigService } from '@nestjs/config';
import { parse } from 'dotenv';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3StorageService } from 'src/storage/s3-storage.service';

async function run() {
  const config = new ConfigService(parse(await readFile('.env')));
  const prisma = new PrismaService(config);
  const storage = new S3StorageService(config);
  try {
    await prisma.$connect();
    const column = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'CompanyLogo' AND column_name = 'content'
      ) AS "exists"
    `;
    if (!column[0]?.exists) {
      console.log(
        'La colonne binaire a déjà été supprimée : aucun logo à migrer.',
      );
      return;
    }
    const logos = await prisma.$queryRaw<
      Array<{ companyId: string; content: Uint8Array }>
    >`
      SELECT "companyId", "content" FROM "CompanyLogo" WHERE "content" IS NOT NULL
    `;
    for (const logo of logos) {
      if (!logo.content) continue;
      const key = `companies/${logo.companyId}/logos/legacy.png`;
      await storage.storeCompanyLogo({
        companyId: logo.companyId,
        key,
        content: Buffer.from(logo.content),
        contentType: 'image/png',
      });
      await prisma.$executeRaw`
        UPDATE "CompanyLogo"
        SET "s3Key" = ${key}, "contentType" = 'image/png', "content" = NULL
        WHERE "companyId" = ${logo.companyId} AND "content" IS NOT NULL
      `;
    }
    console.log(
      `Migration des logos terminée : ${logos.length} logo(s) transféré(s) vers S3.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void run().catch((error) => {
  console.error('Migration des logos interrompue.', error);
  process.exitCode = 1;
});
