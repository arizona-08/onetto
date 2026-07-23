import { BadRequestException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateCompanyDto } from "./dtos/create-company.dto";
import { UpdateCompanyDto } from "./dtos/update-company.dto";

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prismaService: PrismaService
  ) {}

  private async getOwnedCompany(companyId: string, userId: string) {
    const company = await this.prismaService.company.findFirst({
      where: { id: companyId, ownerId: userId },
    });

    if (!company) {
      throw new NotFoundException("Entreprise introuvable ou accès non autorisé.");
    }

    return company;
  }

  async createCompany(data: CreateCompanyDto, ownerId: string) {
    try {
      const company = await this.prismaService.$transaction(async (prisma) => {
        const createdCompany = await prisma.company.create({
          data: { ...data, vatNumber: data.subjectToVat ? data.vatNumber : null, ownerId },
        });

        await prisma.companyUser.create({
          data: { companyId: createdCompany.id, userId: ownerId, role: "ADMIN" },
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
      this.handleDatabaseError(error, "création");
    }
  }

  async getMyCompanies(userId: string) {
    const [companies, user] = await Promise.all([
      this.prismaService.company.findMany({
        where: { ownerId: userId },
        orderBy: { name: "asc" },
      }),
      this.prismaService.user.findUnique({
        where: { id: userId },
        select: { lastConnectedCompanyId: true },
      }),
    ]);

    return { companies, activeCompanyId: user?.lastConnectedCompanyId ?? null };
  }

  async getCompany(companyId: string, userId: string) {
    return this.getOwnedCompany(companyId, userId);
  }

  async updateCompany(companyId: string, data: UpdateCompanyDto, userId: string) {
    await this.getOwnedCompany(companyId, userId);

    try {
      return await this.prismaService.company.update({
        where: { id: companyId },
        data: {
          ...data,
          ...(data.subjectToVat === false ? { vatNumber: null } : {}),
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "mise à jour");
    }
  }

  async selectCompany(companyId: string, userId: string) {
    await this.getOwnedCompany(companyId, userId);

    await this.prismaService.user.update({
      where: { id: userId },
      data: { lastConnectedCompanyId: companyId },
    });

    return { success: true, activeCompanyId: companyId };
  }

  async deleteCompany(companyId: string, userId: string) {
    await this.getOwnedCompany(companyId, userId);

    const invoicesCount = await this.prismaService.invoice.count({ where: { companyId } });
    if (invoicesCount > 0) {
      throw new BadRequestException("Cette entreprise possède des factures et ne peut pas être supprimée.");
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

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new BadRequestException("Une entreprise utilise déjà ces informations uniques (email, téléphone, SIREN ou SIRET)." + error.message);
    }

    throw new InternalServerErrorException(`Une erreur est survenue lors de la ${action} de l'entreprise.`);
  }
}
