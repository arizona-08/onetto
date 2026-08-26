import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { CreateCompanyClientDto } from './dtos/create-company-client.dto';
import { CreateCompanyServiceDto } from './dtos/create-company-service.dto';
import { UpdateCompanyClientDto } from './dtos/update-company-client.dto';
import { UpdateCompanyServiceDto } from './dtos/update-company-service.dto';
import type { ExtendedRequest } from 'src/types/extended-request.types';

@UseGuards(AuthGuard)
@Controller('api/companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  private getUserId(req: ExtendedRequest): string {
    if (!req.user) {
      throw new UnauthorizedException('Non authentifié');
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

  @Get('active')
  getMyActiveCompany(@Req() req: ExtendedRequest) {
    return this.companiesService.getMyActiveCompany(this.getUserId(req));
  }

  @Get('active/plan-access')
  getActiveCompanyPlanAccess(@Req() req: ExtendedRequest) {
    return this.companiesService.getActiveCompanyPlanAccess(
      this.getUserId(req),
    );
  }

  @Get('active/services')
  getActiveCompanyServices(@Req() req: ExtendedRequest) {
    return this.companiesService.getActiveCompanyServices(this.getUserId(req));
  }

  @Get('active/clients')
  getActiveCompanyClients(@Req() req: ExtendedRequest) {
    return this.companiesService.getActiveCompanyClients(this.getUserId(req));
  }

  @Post('active/services')
  createActiveCompanyService(
    @Body() data: CreateCompanyServiceDto,
    @Req() req: ExtendedRequest,
  ) {
    return this.companiesService.createActiveCompanyService(
      this.getUserId(req),
      data,
    );
  }

  @Patch('active/services/:serviceId')
  updateActiveCompanyService(
    @Param('serviceId') serviceId: string,
    @Body() data: UpdateCompanyServiceDto,
    @Req() req: ExtendedRequest,
  ) {
    return this.companiesService.updateActiveCompanyService(
      this.getUserId(req),
      serviceId,
      data,
    );
  }

  @Delete('active/services/:serviceId')
  deleteActiveCompanyService(
    @Param('serviceId') serviceId: string,
    @Req() req: ExtendedRequest,
  ) {
    return this.companiesService.deleteActiveCompanyService(
      this.getUserId(req),
      serviceId,
    );
  }

  @Post('active/clients')
  createActiveCompanyClient(
    @Body() data: CreateCompanyClientDto,
    @Req() req: ExtendedRequest,
  ) {
    return this.companiesService.createActiveCompanyClient(
      this.getUserId(req),
      data,
    );
  }

  @Patch('active/clients/:clientId')
  updateActiveCompanyClient(
    @Param('clientId') clientId: string,
    @Body() data: UpdateCompanyClientDto,
    @Req() req: ExtendedRequest,
  ) {
    return this.companiesService.updateActiveCompanyClient(
      this.getUserId(req),
      clientId,
      data,
    );
  }

  @Delete('active/clients/:clientId')
  deleteActiveCompanyClient(
    @Param('clientId') clientId: string,
    @Req() req: ExtendedRequest,
  ) {
    return this.companiesService.deleteActiveCompanyClient(
      this.getUserId(req),
      clientId,
    );
  }

  @Get(':companyId')
  getCompany(
    @Param('companyId') companyId: string,
    @Req() req: ExtendedRequest,
  ) {
    return this.companiesService.getCompany(companyId, this.getUserId(req));
  }

  @Patch(':companyId/perform-owned-action')
  performOwnedCompanyAction(
    @Param('companyId') companyId: string,
    @Query('action') action: 'reactivate' | 'close',
    @Body('reason') reason: string | undefined,
    @Req() req: ExtendedRequest,
  ) {
    return this.companiesService.performOwnedCompanyAction(
      companyId,
      this.getUserId(req),
      action,
      reason,
    );
  }

  @Patch(':companyId/perform-user-action')
  performUserCompanyAction(
    @Param('companyId') companyId: string,
    @Query('action') action: 'hide' | 'unhide',
    @Req() req: ExtendedRequest,
  ) {
    return this.companiesService.performUserCompanyAction(
      companyId,
      this.getUserId(req),
      action,
    );
  }

  @Patch(':companyId')
  updateCompany(
    @Param('companyId') companyId: string,
    @Body() data: UpdateCompanyDto,
    @Req() req: ExtendedRequest,
  ) {
    return this.companiesService.updateCompany(
      companyId,
      data,
      this.getUserId(req),
    );
  }

  @Post(':companyId/select')
  selectCompany(
    @Param('companyId') companyId: string,
    @Req() req: ExtendedRequest,
  ) {
    return this.companiesService.selectCompany(companyId, this.getUserId(req));
  }

  @Delete(':companyId')
  deleteCompany(
    @Param('companyId') companyId: string,
    @Req() req: ExtendedRequest,
  ) {
    return this.companiesService.deleteCompany(companyId, this.getUserId(req));
  }
}
