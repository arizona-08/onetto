/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are dynamically typed. */
import { BadRequestException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlanAccessService } from 'src/plan-access/plan-access.service';
import sharp from 'sharp';

describe('Company logo', () => {
  const prisma = {
    company: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    companyLogo: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const storage = {
    storeCompanyLogo: jest.fn(),
    getCompanyLogo: jest.fn(),
    deleteCompanyLogo: jest.fn(),
  };
  const service = new CompaniesService(
    prisma as unknown as PrismaService,
    {} as PlanAccessService,
    storage as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.company.findFirst.mockResolvedValue({
      id: 'company-1',
      status: 'ACTIVE',
    });
    prisma.companyLogo.findUnique.mockResolvedValue(null);
    prisma.companyLogo.create.mockResolvedValue({});
    storage.storeCompanyLogo.mockResolvedValue(undefined);
    storage.deleteCompanyLogo.mockResolvedValue(undefined);
    prisma.company.update.mockResolvedValue({ logoUpdatedAt: new Date() });
    prisma.$transaction.mockImplementation(
      async (operations: Promise<unknown>[]) => Promise.all(operations),
    );
  });

  it('conserve le SVG intact dans S3', async () => {
    const file = {
      originalname: 'logo.svg',
      mimetype: 'image/svg+xml',
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>',
      ),
    };

    await service.setLogo('company-1', 'owner-1', file);

    expect(storage.storeCompanyLogo).toHaveBeenCalledWith(
      expect.objectContaining({
        content: file.buffer,
        contentType: 'image/svg+xml',
      }),
    );
    expect(prisma.companyLogo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contentType: 'image/svg+xml',
      }),
    });
    const updateCalls = prisma.company.update.mock.calls as unknown as Array<
      [{ data: { logoUpdatedAt: Date | null } }]
    >;
    expect(updateCalls[1][0].data.logoUpdatedAt).toBeInstanceOf(Date);
  });

  it('refuse un format déclaré qui ne correspond pas au contenu', async () => {
    await expect(
      service.setLogo('company-1', 'owner-1', {
        originalname: 'logo.png',
        mimetype: 'image/png',
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
        ),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.storeCompanyLogo).not.toHaveBeenCalled();
  });

  it.each([
    ['png', 'image/png', 'png'],
    ['jpg', 'image/jpeg', 'jpeg'],
    ['jpeg', 'image/jpeg', 'jpeg'],
    ['webp', 'image/webp', 'webp'],
  ])('accepte un logo %s valide', async (extension, mimetype, format) => {
    const buffer = await sharp({
      create: { width: 10, height: 10, channels: 4, background: '#454ade' },
    })
      .toFormat(format as 'png' | 'jpeg' | 'webp')
      .toBuffer();
    await service.setLogo('company-1', 'owner-1', {
      originalname: `logo.${extension}`,
      mimetype,
      buffer,
    });
    expect(storage.storeCompanyLogo).toHaveBeenCalledTimes(1);
    expect(prisma.companyLogo.create).toHaveBeenCalledTimes(1);
  });

  it('refuse le contenu actif dans un SVG', async () => {
    await expect(
      service.setLogo('company-1', 'owner-1', {
        originalname: 'logo.svg',
        mimetype: 'image/svg+xml',
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>',
        ),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('interdit la modification du logo d’une entreprise fermée', async () => {
    prisma.company.findFirst.mockResolvedValue({
      id: 'company-1',
      status: 'CLOSED',
    });
    await expect(
      service.setLogo('company-1', 'owner-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.storeCompanyLogo).not.toHaveBeenCalled();
  });

  it('supprime l’ancien objet S3 avant de téléverser le nouveau', async () => {
    prisma.companyLogo.findUnique.mockResolvedValue({
      s3Key: 'companies/company-1/logos/old.png',
    });
    await service.setLogo('company-1', 'owner-1', {
      originalname: 'logo.svg',
      mimetype: 'image/svg+xml',
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
      ),
    });
    expect(storage.deleteCompanyLogo).toHaveBeenCalledWith(
      'company-1',
      'companies/company-1/logos/old.png',
    );
    expect(storage.deleteCompanyLogo.mock.invocationCallOrder[0]).toBeLessThan(
      storage.storeCompanyLogo.mock.invocationCallOrder[0],
    );
  });

  it('ne téléverse rien si la suppression précédente échoue', async () => {
    prisma.companyLogo.findUnique.mockResolvedValue({
      s3Key: 'companies/company-1/logos/old.png',
    });
    storage.deleteCompanyLogo.mockRejectedValue(new Error('S3 unavailable'));
    await expect(
      service.setLogo('company-1', 'owner-1', {
        originalname: 'logo.svg',
        mimetype: 'image/svg+xml',
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
        ),
      }),
    ).rejects.toThrow('S3 unavailable');
    expect(storage.storeCompanyLogo).not.toHaveBeenCalled();
  });

  it('retire le logo S3 avant de supprimer sa référence', async () => {
    prisma.companyLogo.findUnique.mockResolvedValue({
      s3Key: 'companies/company-1/logos/old.png',
    });
    await service.removeLogo('company-1', 'owner-1');
    expect(storage.deleteCompanyLogo.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.companyLogo.deleteMany.mock.invocationCallOrder[0],
    );
  });

  it('lit un logo SVG depuis S3 avec son type MIME', async () => {
    const svg = Buffer.from('<svg/>');
    prisma.companyLogo.findUnique.mockResolvedValue({
      s3Key: 'companies/company-1/logos/logo.svg',
      contentType: 'image/svg+xml',
    });
    storage.getCompanyLogo.mockResolvedValue(svg);
    await expect(service.getLogo('company-1')).resolves.toEqual({
      content: svg,
      contentType: 'image/svg+xml',
    });
  });
});
