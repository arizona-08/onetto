import { BadRequestException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateCompanyDto } from "./dtos/create-company.dto";
import { UpdateCompanyDto } from "./dtos/update-company.dto";

const PAID_INVOICE_STATUSES = ['PAID', 'PAID_MANUALLY'] as const;

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
    const [ownedCompanies, companyUsers, user] = await Promise.all([
      this.prismaService.company.findMany({
        where: { ownerId: userId },
        orderBy: { name: "asc" },
      }),
      this.prismaService.companyUser.findMany({
        where: { userId },
        include: { company: true },
      }),
      this.prismaService.user.findUnique({
        where: { id: userId },
        select: { lastConnectedCompanyId: true },
      }),
    ]);

    const companiesById = new Map(
      ownedCompanies.map((company) => [company.id, { ...company, isHidden: false }]),
    );

    for (const companyUser of companyUsers) {
      companiesById.set(companyUser.companyId, {
        ...companyUser.company,
        isHidden: companyUser.isHidden,
      });
    }

    const companies = [...companiesById.values()].sort((first, second) => first.name.localeCompare(second.name));

    return { companies, activeCompanyId: user?.lastConnectedCompanyId ?? null };
  }

  async getCurrentInvoiceFeeSummary(userId: string) {
    const periodStart = this.getStartOfCurrentMonth();
    const companies = await this.prismaService.company.findMany({
      where: { ownerId: userId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        invoicePaymentFees: {
          where: {
            createdAt: { gte: periodStart },
            document: {
              invoiceStatus: { in: [...PAID_INVOICE_STATUSES] },
            },
          },
          select: { amountInCents: true },
        },
      },
    });

    const details = companies.map((company) => {
      const paidInvoicesCount = company.invoicePaymentFees.length;
      const amountInCents = company.invoicePaymentFees.reduce(
        (total, fee) => total + fee.amountInCents,
        0,
      );

      return {
        companyId: company.id,
        companyName: company.name,
        paidInvoicesCount,
        amountInCents,
      };
    });

    return {
      periodStart,
      totalAmountInCents: details.reduce(
        (total, company) => total + company.amountInCents,
        0,
      ),
      companies: details,
    };
  }

  private getStartOfCurrentMonth() {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  async getCompany(companyId: string, userId: string) {
    return this.getOwnedCompany(companyId, userId);
  }

  async getMyActiveCompany(userId: string) {
    try{
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        select: { lastConnectedCompany: true },
      });

      if (!user?.lastConnectedCompany) {
        return null;
      }

      return {
        ...(user.lastConnectedCompany)
      }
    } catch (error) {
      this.handleDatabaseError(error, "récupération de l'entreprise active.");
    }
  }

  async updateCompany(companyId: string, data: UpdateCompanyDto, userId: string) {
    const company = await this.getOwnedCompany(companyId, userId);
    if (company.status === "CLOSED") {
      throw new BadRequestException("Une entreprise fermée ne peut pas être modifiée.");
    }
    const { id: _id, ownerId: _ownerId, ...companyData } = data;

    try {
      return await this.prismaService.company.update({
        where: { id: companyId },
        data: {
          ...companyData,
          ...(companyData.subjectToVat === false ? { vatNumber: null } : {}),
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "mise à jour");
    }
  }

  async selectCompany(companyId: string, userId: string) {
    const company = await this.getOwnedCompany(companyId, userId);

    const companyUser = await this.prismaService.companyUser.findFirst({ where: { companyId, userId } });
    if (companyUser?.isHidden) {
      throw new BadRequestException("Démasquez cette entreprise avant de la sélectionner.");
    }

    await this.prismaService.user.update({
      where: { id: userId },
      data: { lastConnectedCompanyId: companyId },
    });

    return { success: true, activeCompanyId: companyId };
  }

  async performOwnedCompanyAction(companyId: string, userId: string, action: "reactivate" | "close", reason?: string) {
    try{
      await this.getOwnedCompany(companyId, userId);

      let newStatus: "ACTIVE" | "CLOSED";
      const closingReason = reason?.trim();

      switch(action){
        case "reactivate":
          newStatus = "ACTIVE";
          break;
        case "close":
          if (!closingReason) {
            throw new BadRequestException("Le motif de fermeture est obligatoire.");
          }
          newStatus = "CLOSED";
          break;
        default:
          throw new BadRequestException("Action invalide.");
      }

      await this.prismaService.company.update({
        where: { id: companyId },
        data: newStatus === "CLOSED"
          ? { status: newStatus, closingReason: closingReason ?? null, closedAt: new Date() }
          : { status: newStatus },
      });

      return { success: true, status: newStatus };
    } catch (error) {
      this.handleDatabaseError(error, `${action} de l'entreprise`);
    }
  }

  async performUserCompanyAction(companyId: string, userId: string, action: "hide" | "unhide") {
    try {
      const companyUser = await this.prismaService.companyUser.findFirst({
        where: { companyId, userId }
      });

      if(!companyUser){
        throw new NotFoundException("Utilisateur non associé à l'entreprise.");
      }

      if (action === "hide") {
        const user = await this.prismaService.user.findUnique({
          where: { id: userId },
          select: { lastConnectedCompanyId: true },
        });

        if (user?.lastConnectedCompanyId === companyId) {
          throw new BadRequestException("Une entreprise active ne peut pas être masquée.");
        }
      }

      await this.prismaService.companyUser.update({
        where: { id: companyUser.id },
        data: { isHidden: action === "hide" }
      });

      return { success: true };
    } catch (error) {
      this.handleDatabaseError(error, `${action} de l'entreprise`);
    }
  }

  async deleteCompany(companyId: string, userId: string) {
    const company = await this.getOwnedCompany(companyId, userId);
    if (company.status === "CLOSED") {
      throw new BadRequestException("Une entreprise fermée est conservée pour des raisons légales et ne peut pas être supprimée.");
    }

    const invoicesCount = await this.prismaService.document.count({ where: { companyId, type: "INVOICE" } });
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
