import { Body, Controller, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { AuthGuard } from "src/auth/auth.guard";
import { CreateCompanyDto } from "./dtos/create-company.dto";
import type { ExtendedRequest } from "src/types/extended-request.types";

@UseGuards(AuthGuard)
@Controller("api/companies")
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService
  ){}

  async createCompany(@Body() data: CreateCompanyDto, @Req() req: ExtendedRequest) {
    const user = req.user;
    if(!user){
      throw new UnauthorizedException("Non authentifié");
    }

    return await this.companiesService.createCompany(data, user.id);
  }
}