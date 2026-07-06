import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateCompanyDto } from "./dtos/create-company.dto";

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prismaService: PrismaService
  ){}

  async createCompany(data: CreateCompanyDto, ownerId: string){
    try {
      const existingCompany = await this.prismaService.company.findFirst({
        where: {
          IBAN: data.IBAN
        }
      });

      if(existingCompany){
        throw new BadRequestException("Une entreprise avec ce numéro IBAN existe déjà.")
      }

      const createdCompany = await this.prismaService.company.create({
        data: {
          ...data,
          ownerId: ownerId
        }
      });

      return {
        success: true,
        company: createdCompany
      }
    } catch (error: any) {
      throw new InternalServerErrorException("Une erreur est survenu lors de la création de l'entreprise.")
    }
  }
}