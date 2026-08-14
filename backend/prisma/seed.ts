import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const userEmail = 'assijonathan2@gmail.com';
const companyEmail = 'contact@marc-assi.com';

const companyServices = [
  {
    name: 'Diagnostic et conseil en rénovation',
    description: 'Diagnostic et conseil en rénovation',
    unitPrice: 90,
    unit: 'heure',
    taxRate: 20,
    category: 'Conseil',
    wtPrice: 90,
    totalPrice: 108,
  },
  {
    name: 'Pose de carrelage',
    description: 'Pose de carrelage',
    unitPrice: 45,
    unit: 'm²',
    taxRate: 20,
    category: 'Rénovation',
    wtPrice: 45,
    totalPrice: 54,
  },
  {
    name: 'Travaux de peinture intérieure',
    description: 'Travaux de peinture intérieure',
    unitPrice: 35,
    unit: 'm²',
    taxRate: 20,
    category: 'Rénovation',
    wtPrice: 35,
    totalPrice: 42,
  },
  {
    name: 'Installation de mobilier sur mesure',
    description: 'Installation de mobilier sur mesure',
    unitPrice: 65,
    unit: 'heure',
    taxRate: 20,
    category: 'Aménagement',
    wtPrice: 65,
    totalPrice: 78,
  },
];

const companyClients = [
  {
    name: 'Bryan ASSI',
    email: 'assijonathan08@gmail.com',
    address: '18 avenue Parmentier',
    city: 'Paris',
    postalCode: '75011',
    country: 'France',
  },
  {
    name: 'Cabinet Rivoli',
    email: 'contact@cabinet-rivoli.example.com',
    address: '27 rue de Rivoli',
    city: 'Paris',
    postalCode: '75004',
    country: 'France',
  },
  {
    name: 'Thomas Bernard',
    email: 'thomas.bernard@example.com',
    address: '6 rue du Général Leclerc',
    city: 'Vincennes',
    postalCode: '94300',
    country: 'France',
  },
];

async function seed() {
  const password = await argon2.hash('test123456');
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      firstname: 'Jonathan',
      lastname: 'ASSI',
      password,
    },
    create: {
      firstname: 'Jonathan',
      lastname: 'ASSI',
      email: userEmail,
      password,
    },
  });

  const company = await prisma.company.upsert({
    where: { email: companyEmail },
    update: {
      ownerId: user.id,
      name: 'Jonathan ASSI (Micro-Entreprise)',
      phoneNumber: '01 02 03 04 05',
      siren: '732829320',
      siret: '73282932000074',
      address: '10 rue de la Paix',
      city: 'Paris',
      postalCode: '75012',
      country: 'France',
      subjectToVat: true,
      vatNumber: 'FR44732829320',
      IBAN: 'FR7610096000300012345678918',
      BIC: 'CMCIFRPP',
      status: 'ACTIVE',
      closingReason: null,
      closedAt: null,
    },
    create: {
      ownerId: user.id,
      name: 'Jonathan ASSI (Micro-Entreprise)',
      email: companyEmail,
      phoneNumber: '01 02 03 04 05',
      siren: '732829320',
      siret: '73282932000074',
      address: '10 rue de la Paix',
      city: 'Paris',
      postalCode: '75012',
      country: 'France',
      subjectToVat: true,
      vatNumber: 'FR44732829320',
      IBAN: 'FR7610096000300012345678918',
      BIC: 'CMCIFRPP',
    },
  });

  await prisma.companyUser.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: user.id,
      },
    },
    update: { role: 'ADMIN', isHidden: false },
    create: {
      companyId: company.id,
      userId: user.id,
      role: 'ADMIN',
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastConnectedCompanyId: company.id },
  });

  for (const service of companyServices) {
    const existingService = await prisma.companyService.findFirst({
      where: {
        companyId: company.id,
        description: service.description,
      },
    });

    if (existingService) {
      await prisma.companyService.update({
        where: { id: existingService.id },
        data: service,
      });
      continue;
    }

    await prisma.companyService.create({
      data: { ...service, companyId: company.id },
    });
  }

  for (const client of companyClients) {
    const existingClient = await prisma.companyClient.findFirst({
      where: {
        companyId: company.id,
        email: client.email,
      },
    });

    if (existingClient) {
      await prisma.companyClient.update({
        where: { id: existingClient.id },
        data: client,
      });
      continue;
    }

    await prisma.companyClient.create({
      data: { ...client, companyId: company.id },
    });
  }

  console.log(`Jeu de données créé pour ${user.email}.`);
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
