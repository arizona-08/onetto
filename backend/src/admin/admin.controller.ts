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
  IsOptional,
  IsString,
  IsUUID,
  Matches,
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

class PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  page?: number;
}

class UsersQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
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
  q?: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
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
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
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
  company(@Param('companyId') companyId: string) {
    return this.admin.company(companyId);
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
  services(
    @Query() query: PaginationQuery & { q?: string; companyId?: string },
  ) {
    return this.admin.services({
      page: query.page,
      query: query.q,
      companyId: query.companyId,
    });
  }

  @Get('subscriptions')
  subscriptions(@Query() query: PaginationQuery & { plan?: SubscriptionPlan }) {
    return this.admin.subscriptions({ page: query.page, plan: query.plan });
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
  payments(@Query() query: PaginationQuery & { q?: string }) {
    return this.admin.payments({ page: query.page, query: query.q });
  }

  @Get('system')
  system() {
    return this.admin.system();
  }

  @Get('search')
  search(@Query('q') query = '') {
    return this.admin.search(query);
  }

  private adminId(request: ExtendedRequest): string {
    return request.user!.id;
  }
}
