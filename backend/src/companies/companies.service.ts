import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { CreateCompanyClientDto } from './dtos/create-company-client.dto';
import { CreateCompanyServiceDto } from './dtos/create-company-service.dto';
import { UpdateCompanyClientDto } from './dtos/update-company-client.dto';
import { UpdateCompanyServiceDto } from './dtos/update-company-service.dto';
import { PlanAccessService } from 'src/plan-access/plan-access.service';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { S3StorageService } from 'src/storage/s3-storage.service';

@Injectable()
export class CompaniesService {
  private readonly logoLocks = new Map<string, Promise<void>>();

  constructor(
    private readonly prismaService: PrismaService,
    private readonly planAccessService: PlanAccessService,
    private readonly storage: S3StorageService,
  ) {}

  private async withLogoLock<T>(
    companyId: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const previous = this.logoLocks.get(companyId) ?? Promise.resolve();
    let unlock!: () => void;
    const current = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    this.logoLocks.set(companyId, current);
    await previous;
    try {
      return await action();
    } finally {
      if (this.logoLocks.get(companyId) === current)
        this.logoLocks.delete(companyId);
      unlock();
    }
  }

  private async getOwnedCompany(companyId: string, userId: string) {
    const company = await this.prismaService.company.findFirst({
      where: { id: companyId, ownerId: userId },
    });

    if (!company) {
      throw new NotFoundException(
        'Entreprise introuvable ou accès non autorisé.',
      );
    }

    return company;
  }

  async setLogo(
    companyId: string,
    userId: string,
    file?: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    },
  ) {
    const company = await this.getOwnedCompany(companyId, userId);
    if (company.status === 'CLOSED')
      throw new BadRequestException(
        'Une entreprise fermée ne peut pas être modifiée.',
      );
    if (!file?.buffer?.length || file.buffer.length > 2_000_000) {
      throw new BadRequestException('Le logo doit peser moins de 2 Mo.');
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase();
    const accepted = new Map([
      ['png', ['image/png', 'png']],
      ['jpg', ['image/jpeg', 'jpeg']],
      ['jpeg', ['image/jpeg', 'jpeg']],
      ['webp', ['image/webp', 'webp']],
      ['svg', ['image/svg+xml', 'svg']],
    ]);
    const expected = extension ? accepted.get(extension) : undefined;
    if (!expected || file.mimetype !== expected[0]) {
      throw new BadRequestException(
        'Format accepté : PNG, JPG, JPEG, WEBP ou SVG.',
      );
    }
    if (
      extension === 'svg' &&
      /<!DOCTYPE|<!ENTITY|<\?|<\s*(?:script|foreignObject|image|use|animate|set|filter|feImage)\b|\bon[a-z]+\s*=|\b(?:href|xlink:href|style)\s*=|url\s*\(/i.test(
        file.buffer.toString('utf8'),
      )
    ) {
      throw new BadRequestException(
        'Ce SVG contient des ressources externes ou du contenu actif.',
      );
    }

    let content: Buffer;
    try {
      const image = sharp(file.buffer, { limitInputPixels: 16_000_000 });
      const metadata = await image.metadata();
      if (metadata.format !== expected[1]) throw new Error('Format incohérent');
      content =
        extension === 'svg'
          ? file.buffer
          : await image
              .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
              .png()
              .toBuffer();
    } catch {
      throw new BadRequestException(
        'Le fichier image est invalide ou trop grand.',
      );
    }

    return this.withLogoLock(companyId, async () => {
      const previous = await this.prismaService.companyLogo.findUnique({
        where: { companyId },
        select: { s3Key: true },
      });
      if (previous?.s3Key)
        await this.storage.deleteCompanyLogo(companyId, previous.s3Key);
      // Clear the reference before uploading: a failed upload must not leave a deleted S3 key in use.
      await this.prismaService.$transaction([
        this.prismaService.companyLogo.deleteMany({ where: { companyId } }),
        this.prismaService.company.update({
          where: { id: companyId },
          data: { logoUpdatedAt: null },
        }),
      ]);
      const key = `companies/${companyId}/logos/${randomUUID()}.${extension === 'svg' ? 'svg' : 'png'}`;
      const contentType = extension === 'svg' ? 'image/svg+xml' : 'image/png';
      await this.storage.storeCompanyLogo({
        companyId,
        key,
        content,
        contentType,
      });
      try {
        const [, updatedCompany] = await this.prismaService.$transaction([
          this.prismaService.companyLogo.create({
            data: { companyId, s3Key: key, contentType },
          }),
          this.prismaService.company.update({
            where: { id: companyId },
            data: { logoUpdatedAt: new Date() },
          }),
        ]);
        return { logoUpdatedAt: updatedCompany.logoUpdatedAt };
      } catch (error) {
        await this.storage.deleteCompanyLogo(companyId, key);
        throw error;
      }
    });
  }

  async removeLogo(companyId: string, userId: string) {
    const company = await this.getOwnedCompany(companyId, userId);
    if (company.status === 'CLOSED')
      throw new BadRequestException(
        'Une entreprise fermée ne peut pas être modifiée.',
      );
    return this.withLogoLock(companyId, async () => {
      const previous = await this.prismaService.companyLogo.findUnique({
        where: { companyId },
        select: { s3Key: true },
      });
      if (previous?.s3Key)
        await this.storage.deleteCompanyLogo(companyId, previous.s3Key);
      await this.prismaService.$transaction([
        this.prismaService.companyLogo.deleteMany({ where: { companyId } }),
        this.prismaService.company.update({
          where: { id: companyId },
          data: { logoUpdatedAt: null },
        }),
      ]);
      return { logoUpdatedAt: null };
    });
  }

  async getLogo(
    companyId: string,
  ): Promise<{ content: Buffer; contentType: string }> {
    const logo = await this.prismaService.companyLogo.findUnique({
      where: { companyId },
      select: { s3Key: true, contentType: true },
    });
    if (!logo) throw new NotFoundException('Logo introuvable.');
    if (logo.s3Key)
      return {
        content: await this.storage.getCompanyLogo(companyId, logo.s3Key),
        contentType: logo.contentType ?? 'image/png',
      };
    throw new NotFoundException('Logo introuvable.');
  }

  private async getAccessibleCompany(companyId: string, userId: string) {
    const company = await this.prismaService.company.findFirst({
      where: {
        id: companyId,
        status: 'ACTIVE',
        OR: [{ ownerId: userId }, { companyUsers: { some: { userId } } }],
      },
      include: {
        companyPaymentAccount: {
          select: {
            id: true,
            companyId: true,
            creditorId: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(
        'Entreprise introuvable ou accès non autorisé.',
      );
    }

    return company;
  }

  async createCompany(data: CreateCompanyDto, ownerId: string) {
    try {
      await this.planAccessService.assertCanCreateCompany(ownerId);
      const company = await this.prismaService.$transaction(async (prisma) => {
        // Serialize company creation with account closure's user-row update.
        const owners = await prisma.$queryRaw<Array<{ closedAt: Date | null }>>`
          SELECT "closedAt" FROM "User" WHERE "id" = ${ownerId} FOR UPDATE
        `;
        if (!owners.length || owners[0].closedAt) {
          throw new BadRequestException('Ce compte est clôturé.');
        }
        const createdCompany = await prisma.company.create({
          data: {
            ...data,
            bank: data.bank?.trim() || null,
            vatNumber: data.subjectToVat ? data.vatNumber : null,
            hasVatOnDebits: data.vatExigibility === 'ON_DEBITS',
            ownerId,
          },
        });

        await prisma.companyUser.create({
          data: {
            companyId: createdCompany.id,
            userId: ownerId,
            role: 'ADMIN',
          },
        });

        // Une nouvelle entreprise devient immédiatement l'entreprise active.
        await prisma.user.update({
          where: { id: ownerId },
          data: { lastConnectedCompanyId: createdCompany.id },
        });

        return createdCompany;
      });

      return { success: true, company };
    } catch (error) {
      this.handleDatabaseError(error, 'création');
    }
  }

  async getMyCompanies(userId: string) {
    const [ownedCompanies, companyUsers, user] = await Promise.all([
      this.prismaService.company.findMany({
        where: { ownerId: userId, status: 'ACTIVE' },
        include: {
          companyPaymentAccount: {
            select: {
              id: true,
              companyId: true,
              creditorId: true,
              verificationStatus: true,
            },
          },
          electronicInvoicingConnection: {
            select: { status: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prismaService.companyUser.findMany({
        where: { userId, company: { status: 'ACTIVE' } },
        include: {
          company: {
            include: {
              companyPaymentAccount: {
                select: {
                  id: true,
                  companyId: true,
                  creditorId: true,
                  verificationStatus: true,
                },
              },
              electronicInvoicingConnection: { select: { status: true } },
            },
          },
        },
      }),
      this.prismaService.user.findUnique({
        where: { id: userId },
        select: { lastConnectedCompanyId: true },
      }),
    ]);

    const companiesById = new Map(
      ownedCompanies.map((company) => [
        company.id,
        { ...company, isHidden: false },
      ]),
    );

    for (const companyUser of companyUsers) {
      companiesById.set(companyUser.companyId, {
        ...companyUser.company,
        isHidden: companyUser.isHidden,
        companyPaymentAccount: companyUser.company.companyPaymentAccount,
      });
    }

    const companies = [...companiesById.values()]
      .map((company) => ({
        ...company,
        hasRequiredAction:
          !company.companyPaymentAccount ||
          company.companyPaymentAccount.verificationStatus !== 'VERIFIED' ||
          company.electronicInvoicingConnection?.status !== 'ACTIVE',
      }))
      .sort((first, second) => first.name.localeCompare(second.name));

    return { companies, activeCompanyId: user?.lastConnectedCompanyId ?? null };
  }

  async getCompany(companyId: string, userId: string) {
    return this.getAccessibleCompany(companyId, userId);
  }

  async getMyActiveCompany(userId: string) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: {
          lastConnectedCompany: {
            include: {
              companyPaymentAccount: {
                select: {
                  id: true,
                  companyId: true,
                  creditorId: true,
                  verificationStatus: true,
                },
              },
              electronicInvoicingConnection: { select: { status: true } },
            },
          },
        },
      });

      if (
        !user?.lastConnectedCompany ||
        user.lastConnectedCompany.status === 'CLOSED'
      ) {
        return null;
      }

      const company = user.lastConnectedCompany;
      return {
        ...company,
        hasRequiredAction:
          !company.companyPaymentAccount ||
          company.companyPaymentAccount.verificationStatus !== 'VERIFIED' ||
          company.electronicInvoicingConnection?.status !== 'ACTIVE',
      };
    } catch (error) {
      this.handleDatabaseError(error, "récupération de l'entreprise active.");
    }
  }

  async getActiveCompanyPlanAccess(userId: string) {
    const companyId = await this.getActiveCompanyIdForUser(userId);
    return this.planAccessService.getCompanyAccess(companyId);
  }

  async getActiveCompanyServices(userId: string) {
    const companyId = await this.getActiveCompanyIdForUser(userId);

    return this.prismaService.companyService.findMany({
      where: { companyId },
      orderBy: { description: 'asc' },
    });
  }

  async getActiveCompanyClients(userId: string) {
    const companyId = await this.getActiveCompanyIdForUser(userId);

    return this.prismaService.companyClient.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async createActiveCompanyService(
    userId: string,
    data: CreateCompanyServiceDto,
  ) {
    const companyId = await this.getActiveCompanyIdForUser(userId);
    await this.ensureCompanyCatalogIsEditable(companyId);

    return this.prismaService.companyService.create({
      data: {
        ...data,
        companyId,
        itemType: data.itemType ?? 'SERVICES',
        taxRate: data.taxRate ?? 0,
        wtPrice: data.unitPrice,
        totalPrice: this.getServiceTotalPrice(data.unitPrice, data.taxRate),
      },
    });
  }

  async updateActiveCompanyService(
    userId: string,
    serviceId: string,
    data: UpdateCompanyServiceDto,
  ) {
    const companyId = await this.getActiveCompanyIdForUser(userId);
    await this.ensureCompanyCatalogIsEditable(companyId);
    const existingService = await this.prismaService.companyService.findFirst({
      where: { id: serviceId, companyId },
    });

    if (!existingService) {
      throw new NotFoundException('Service introuvable.');
    }

    const unitPrice = data.unitPrice ?? existingService.unitPrice;
    const taxRate = data.taxRate ?? existingService.taxRate ?? 0;

    return this.prismaService.companyService.update({
      where: { id: serviceId },
      data: {
        ...data,
        wtPrice: unitPrice,
        totalPrice: this.getServiceTotalPrice(unitPrice, taxRate),
      },
    });
  }

  async deleteActiveCompanyService(userId: string, serviceId: string) {
    const companyId = await this.getActiveCompanyIdForUser(userId);
    await this.ensureCompanyCatalogIsEditable(companyId);
    const existingService = await this.prismaService.companyService.findFirst({
      where: { id: serviceId, companyId },
      select: { id: true },
    });

    if (!existingService) {
      throw new NotFoundException('Service introuvable.');
    }

    await this.prismaService.companyService.delete({
      where: { id: serviceId },
    });

    return { success: true };
  }

  async createActiveCompanyClient(
    userId: string,
    data: CreateCompanyClientDto,
  ) {
    const companyId = await this.getActiveCompanyIdForUser(userId);
    await this.ensureCompanyCatalogIsEditable(companyId);

    return this.prismaService.companyClient.create({
      data: { ...data, companyId },
    });
  }

  async updateActiveCompanyClient(
    userId: string,
    clientId: string,
    data: UpdateCompanyClientDto,
  ) {
    const companyId = await this.getActiveCompanyIdForUser(userId);
    await this.ensureCompanyCatalogIsEditable(companyId);
    const existingClient = await this.prismaService.companyClient.findFirst({
      where: { id: clientId, companyId },
      select: { id: true },
    });

    if (!existingClient) {
      throw new NotFoundException('Client introuvable.');
    }

    return this.prismaService.companyClient.update({
      where: { id: clientId },
      data,
    });
  }

  async deleteActiveCompanyClient(userId: string, clientId: string) {
    const companyId = await this.getActiveCompanyIdForUser(userId);
    await this.ensureCompanyCatalogIsEditable(companyId);
    const existingClient = await this.prismaService.companyClient.findFirst({
      where: { id: clientId, companyId },
      select: { id: true },
    });

    if (!existingClient) {
      throw new NotFoundException('Client introuvable.');
    }

    await this.prismaService.companyClient.delete({
      where: { id: clientId },
    });

    return { success: true };
  }

  private async getActiveCompanyIdForUser(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { lastConnectedCompanyId: true },
    });

    if (!user?.lastConnectedCompanyId) {
      throw new NotFoundException('Aucune entreprise active sélectionnée.');
    }

    const companyUser = await this.prismaService.companyUser.findFirst({
      where: {
        companyId: user.lastConnectedCompanyId,
        userId,
        isHidden: false,
        company: { status: 'ACTIVE' },
      },
      select: { companyId: true },
    });

    if (!companyUser) {
      throw new NotFoundException(
        'Entreprise active introuvable ou accès non autorisé.',
      );
    }

    return companyUser.companyId;
  }

  private async ensureCompanyCatalogIsEditable(companyId: string) {
    const company = await this.prismaService.company.findUnique({
      where: { id: companyId },
      select: { status: true },
    });

    if (!company || company.status === 'CLOSED') {
      throw new BadRequestException(
        'Le catalogue d’une entreprise fermée ne peut pas être modifié.',
      );
    }
  }

  private getServiceTotalPrice(unitPrice: number, taxRate?: number) {
    return unitPrice * (1 + (taxRate ?? 0) / 100);
  }

  async updateCompany(
    companyId: string,
    data: UpdateCompanyDto,
    userId: string,
  ) {
    const company = await this.getOwnedCompany(companyId, userId);
    if (company.status === 'CLOSED') {
      throw new BadRequestException(
        'Une entreprise fermée ne peut pas être modifiée.',
      );
    }
    const companyData = { ...data };
    delete companyData.id;
    delete companyData.ownerId;

    try {
      return await this.prismaService.company.update({
        where: { id: companyId },
        data: {
          ...companyData,
          ...(companyData.bank !== undefined
            ? { bank: companyData.bank?.trim() || null }
            : {}),
          ...(companyData.vatExigibility
            ? { hasVatOnDebits: companyData.vatExigibility === 'ON_DEBITS' }
            : {}),
          ...(companyData.subjectToVat === false ? { vatNumber: null } : {}),
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'mise à jour');
    }
  }

  async selectCompany(companyId: string, userId: string) {
    await this.getAccessibleCompany(companyId, userId);

    const companyUser = await this.prismaService.companyUser.findFirst({
      where: { companyId, userId },
    });
    if (companyUser?.isHidden) {
      throw new BadRequestException(
        'Démasquez cette entreprise avant de la sélectionner.',
      );
    }

    await this.prismaService.user.update({
      where: { id: userId },
      data: { lastConnectedCompanyId: companyId },
    });

    return { success: true, activeCompanyId: companyId };
  }

  async performOwnedCompanyAction(
    companyId: string,
    userId: string,
    action: 'reactivate' | 'close',
    reason?: string,
  ) {
    try {
      const company = await this.getOwnedCompany(companyId, userId);
      if (action === 'reactivate' && company.closedByAccountClosureAt) {
        throw new BadRequestException(
          'Cette entreprise a été fermée avec le compte de son propriétaire.',
        );
      }

      let newStatus: 'ACTIVE' | 'CLOSED';
      const closingReason = reason?.trim();

      switch (action) {
        case 'reactivate':
          newStatus = 'ACTIVE';
          break;
        case 'close':
          if (!closingReason) {
            throw new BadRequestException(
              'Le motif de fermeture est obligatoire.',
            );
          }
          newStatus = 'CLOSED';
          break;
        default:
          throw new BadRequestException('Action invalide.');
      }

      if (newStatus === 'CLOSED') {
        await this.closeCompany(
          this.prismaService,
          companyId,
          closingReason!,
          new Date(),
        );
      } else {
        await this.prismaService.company.update({
          where: { id: companyId },
          data: { status: 'ACTIVE', closedAt: null, closingReason: null },
        });
      }

      return { success: true, status: newStatus };
    } catch (error) {
      this.handleDatabaseError(error, `${action} de l'entreprise`);
    }
  }

  async closeCompany(
    db: Pick<PrismaService, 'company'>,
    companyId: string,
    reason: string,
    at: Date,
    accountClosure = false,
  ) {
    const company = await db.company.findUniqueOrThrow({
      where: { id: companyId },
    });
    return db.company.update({
      where: { id: companyId },
      data: {
        status: 'CLOSED',
        closedAt: company.closedAt ?? at,
        closingReason: company.closingReason ?? reason,
        ...(accountClosure ? { closedByAccountClosureAt: at } : {}),
      },
    });
  }

  async performUserCompanyAction(
    companyId: string,
    userId: string,
    action: 'hide' | 'unhide',
  ) {
    try {
      const companyUser = await this.prismaService.companyUser.findFirst({
        where: { companyId, userId, company: { status: 'ACTIVE' } },
      });

      if (!companyUser) {
        throw new NotFoundException("Utilisateur non associé à l'entreprise.");
      }

      if (action === 'hide') {
        const user = await this.prismaService.user.findUnique({
          where: { id: userId },
          select: { lastConnectedCompanyId: true },
        });

        if (user?.lastConnectedCompanyId === companyId) {
          throw new BadRequestException(
            'Une entreprise active ne peut pas être masquée.',
          );
        }
      }

      await this.prismaService.companyUser.update({
        where: { id: companyUser.id },
        data: { isHidden: action === 'hide' },
      });

      return { success: true };
    } catch (error) {
      this.handleDatabaseError(error, `${action} de l'entreprise`);
    }
  }

  async deleteCompany(companyId: string, userId: string) {
    const company = await this.getOwnedCompany(companyId, userId);
    if (company.status === 'CLOSED') {
      throw new BadRequestException(
        'Une entreprise fermée est conservée pour des raisons légales et ne peut pas être supprimée.',
      );
    }

    const invoicesCount = await this.prismaService.document.count({
      where: { companyId, type: 'INVOICE' },
    });
    if (invoicesCount > 0) {
      throw new BadRequestException(
        'Cette entreprise possède des factures et ne peut pas être supprimée.',
      );
    }

    await this.prismaService.$transaction([
      this.prismaService.companyUser.deleteMany({ where: { companyId } }),
      this.prismaService.user.updateMany({
        where: { lastConnectedCompanyId: companyId },
        data: { lastConnectedCompanyId: null },
      }),
      this.prismaService.company.delete({ where: { id: companyId } }),
    ]);

    return { success: true };
  }

  private handleDatabaseError(error: unknown, action: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException(
        'Une entreprise utilise déjà ces informations uniques (email, téléphone, SIREN ou SIRET).' +
          error.message,
      );
    }

    throw new InternalServerErrorException(
      `Une erreur est survenue lors de la ${action} de l'entreprise.`,
    );
  }
}
