import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@UseGuards(AuthGuard, AdminGuard)
@Controller('api/admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('dashboard') dashboard(@Req() _request: ExtendedRequest) { return this.admin.dashboard(); }
  @Get('users') users(@Query('page') page?: string, @Query('q') query?: string) { return this.admin.users(Math.max(1, Number(page) || 1), query?.trim() ?? ''); }
}
