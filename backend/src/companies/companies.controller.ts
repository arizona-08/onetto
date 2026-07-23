import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { AuthGuard } from "src/auth/auth.guard";
import { CreateCompanyDto } from "./dtos/create-company.dto";
import { UpdateCompanyDto } from "./dtos/update-company.dto";
import type { ExtendedRequest } from "src/types/extended-request.types";

@UseGuards(AuthGuard)
@Controller("api/companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  private getUserId(req: ExtendedRequest): string {
    if (!req.user) {
      throw new UnauthorizedException("Non authentifié");
    }

    return req.user.id;
  }

  @Post()
  createCompany(@Body() data: CreateCompanyDto, @Req() req: ExtendedRequest) {
    return this.companiesService.createCompany(data, this.getUserId(req));
  }

  @Get()
  getMyCompanies(@Req() req: ExtendedRequest) {
    return this.companiesService.getMyCompanies(this.getUserId(req));
  }

  @Get(":companyId")
  getCompany(@Param("companyId") companyId: string, @Req() req: ExtendedRequest) {
    return this.companiesService.getCompany(companyId, this.getUserId(req));
  }

  @Patch(":companyId")
  updateCompany(@Param("companyId") companyId: string, @Body() data: UpdateCompanyDto, @Req() req: ExtendedRequest) {
    return this.companiesService.updateCompany(companyId, data, this.getUserId(req));
  }

  @Post(":companyId/select")
  selectCompany(@Param("companyId") companyId: string, @Req() req: ExtendedRequest) {
    return this.companiesService.selectCompany(companyId, this.getUserId(req));
  }

  @Delete(":companyId")
  deleteCompany(@Param("companyId") companyId: string, @Req() req: ExtendedRequest) {
    return this.companiesService.deleteCompany(companyId, this.getUserId(req));
  }
}
