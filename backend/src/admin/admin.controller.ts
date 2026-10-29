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
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  AccountType,
  CompanyStatus,
  CompanyUserRole,
  SubscriptionPlan,
} from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminRevenueService } from './admin-revenue.service';
import type { RevenuePeriod } from './admin-revenue.service';
import { UpdateCompanyServiceDto } from 'src/companies/dtos/update-company-service.dto';

class PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

class UsersQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}

class CompaniesQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}

class SearchQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

class RevenueQuery {
  @IsOptional()
  @IsIn(['week', 'month', 'year'])
  period?: RevenuePeriod;
}

class ServicesQuery extends SearchQuery {
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

class SubscriptionsQuery extends SearchQuery {
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;
}

class SystemQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  webhooksPage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  webhooksQ?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  auditsPage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  auditsQ?: string;
}

class CompanyDetailQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  collaboratorsPage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  collaboratorsQ?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  documentsPage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentsQ?: string;
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/, { message: 'Le prénom ne peut pas être vide.' })
  firstname?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/, { message: 'Le nom ne peut pas être vide.' })
  lastname?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;
}

class UpdateUserSubscriptionDto {
  @IsEnum(SubscriptionPlan)
  subscriptionPlan: SubscriptionPlan;
}

class InviteUserDto {
  @IsEmail()
  email: string;

  @IsEnum(SubscriptionPlan)
  subscriptionPlan: SubscriptionPlan;

  @IsInt()
  @IsIn([0, 5, 10, 15, 20, 25, 30, 35, 40])
  discountPercent: number;
}

class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBoolean()
  subjectToVat?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  vatNumber?: string | null;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  closingReason?: string | null;
}

class CompanyUserDto {
  @IsUUID()
  userId: string;

  @IsEnum(CompanyUserRole)
  role: CompanyUserRole;
}

class UpdateCompanyUserDto {
  @IsEnum(CompanyUserRole)
  role: CompanyUserRole;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}

@UseGuards(AuthGuard, AdminGuard)
@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly revenueService: AdminRevenueService,
  ) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('dashboard/revenue')
  revenue(@Query() query: RevenueQuery) {
    return this.revenueService.revenue(query.period ?? 'year');
  }

  @Get('users')
  users(@Query() query: UsersQuery) {
    return this.admin.users({
      page: query.page,
      query: query.q,
      accountType: query.accountType,
      plan: query.plan,
      active: query.active,
    });
  }

  @Post('users/invitations')
  inviteUser(@Req() req: ExtendedRequest, @Body() body: InviteUserDto) {
    return this.admin.inviteUser(this.adminId(req), body);
  }

  @Get('users/:userId')
  user(@Param('userId') userId: string) {
    return this.admin.user(userId);
  }

  @Patch('users/:userId')
  updateUser(
    @Req() req: ExtendedRequest,
    @Param('userId') userId: string,
    @Body() data: UpdateUserDto,
  ) {
    return this.admin.updateUser(this.adminId(req), userId, data);
  }

  @Patch('users/:userId/ban')
  banUser(@Req() req: ExtendedRequest, @Param('userId') userId: string) {
    return this.admin.setUserBanState(this.adminId(req), userId, true);
  }

  @Delete('users/:userId/ban')
  unbanUser(@Req() req: ExtendedRequest, @Param('userId') userId: string) {
    return this.admin.setUserBanState(this.adminId(req), userId, false);
  }

  @Get('companies')
  companies(@Query() query: CompaniesQuery) {
    return this.admin.companies({
      page: query.page,
      query: query.q,
      status: query.status,
    });
  }

  @Get('companies/:companyId')
  company(
    @Param('companyId') companyId: string,
    @Query() query: CompanyDetailQuery,
  ) {
    return this.admin.company(companyId, {
      collaboratorsPage: query.collaboratorsPage,
      collaboratorsQuery: query.collaboratorsQ,
      documentsPage: query.documentsPage,
      documentsQuery: query.documentsQ,
    });
  }

  @Patch('companies/:companyId')
  updateCompany(
    @Req() req: ExtendedRequest,
    @Param('companyId') companyId: string,
    @Body() data: UpdateCompanyDto,
  ) {
    return this.admin.updateCompany(this.adminId(req), companyId, data);
  }

  @Post('companies/:companyId/collaborators')
  addCollaborator(
    @Req() req: ExtendedRequest,
    @Param('companyId') companyId: string,
    @Body() data: CompanyUserDto,
  ) {
    return this.admin.addCompanyUser(
      this.adminId(req),
      companyId,
      data.userId,
      data.role,
    );
  }

  @Patch('collaborators/:collaboratorId')
  updateCollaborator(
    @Req() req: ExtendedRequest,
    @Param('collaboratorId') collaboratorId: string,
    @Body() data: UpdateCompanyUserDto,
  ) {
    return this.admin.updateCompanyUser(
      this.adminId(req),
      collaboratorId,
      data.role,
      data.isHidden,
    );
  }

  @Delete('collaborators/:collaboratorId')
  removeCollaborator(
    @Req() req: ExtendedRequest,
    @Param('collaboratorId') collaboratorId: string,
  ) {
    return this.admin.removeCompanyUser(this.adminId(req), collaboratorId);
  }

  @Get('services')
  services(@Query() query: ServicesQuery) {
    return this.admin.services({
      page: query.page,
      query: query.q,
      companyId: query.companyId,
    });
  }

  @Patch('services/:serviceId')
  updateService(
    @Req() req: ExtendedRequest,
    @Param('serviceId') serviceId: string,
    @Body() data: UpdateCompanyServiceDto,
  ) {
    return this.admin.updateService(this.adminId(req), serviceId, data);
  }

  @Delete('services/:serviceId')
  deleteService(
    @Req() req: ExtendedRequest,
    @Param('serviceId') serviceId: string,
  ) {
    return this.admin.deleteService(this.adminId(req), serviceId);
  }

  @Get('subscriptions')
  subscriptions(@Query() query: SubscriptionsQuery) {
    return this.admin.subscriptions({
      page: query.page,
      query: query.q,
      plan: query.plan,
    });
  }

  @Patch('users/:userId/subscription')
  changeUserSubscription(
    @Req() req: ExtendedRequest,
    @Param('userId') userId: string,
    @Body() data: UpdateUserSubscriptionDto,
  ) {
    return this.admin.changeUserSubscription(
      this.adminId(req),
      userId,
      data.subscriptionPlan,
    );
  }

  @Delete('users/:userId/subscription/pending')
  cancelPendingSubscriptionChange(
    @Req() req: ExtendedRequest,
    @Param('userId') userId: string,
  ) {
    return this.admin.cancelPendingSubscriptionChange(
      this.adminId(req),
      userId,
    );
  }

  @Post('subscriptions/:userId/resync')
  resyncSubscription(
    @Req() req: ExtendedRequest,
    @Param('userId') userId: string,
  ) {
    return this.admin.resyncSubscription(this.adminId(req), userId);
  }

  @Get('payments')
  payments(@Query() query: SearchQuery) {
    return this.admin.payments({ page: query.page, query: query.q });
  }

  @Get('system')
  system(@Query() query: SystemQuery) {
    return this.admin.system({
      webhooksPage: query.webhooksPage,
      webhooksQuery: query.webhooksQ,
      auditsPage: query.auditsPage,
      auditsQuery: query.auditsQ,
    });
  }

  @Get('search')
  search(@Query('q') query = '') {
    return this.admin.search(query);
  }

  private adminId(request: ExtendedRequest): string {
    return request.user!.id;
  }
}
