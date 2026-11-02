import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import type { Response } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { AdminGuard } from 'src/admin/admin.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { AccountClosureService } from './account-closure.service';

class CloseAccountDto {
  @IsString()
  @MinLength(1)
  password: string;
}

class AcknowledgeReviewDto {
  @IsString()
  action: string;
}

@Controller('api/account-closure')
export class AccountClosureController {
  constructor(private readonly closure: AccountClosureService) {}

  @UseGuards(AuthGuard)
  @Post()
  async close(
    @Req() request: ExtendedRequest,
    @Body() body: CloseAccountDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.closure.close(request.user!.id, body.password);
    response.clearCookie('access_token');
    response.clearCookie('refresh_token');
    return result;
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Get('admin/pending')
  pending() {
    return this.closure.listPending();
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post('admin/:userId/retry')
  async retry(@Param('userId') userId: string) {
    await this.closure.process(userId);
    return { attempted: true };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Post('admin/:userId/acknowledge')
  acknowledge(
    @Param('userId') userId: string,
    @Body() body: AcknowledgeReviewDto,
  ) {
    return this.closure.acknowledgeReview(userId, body.action);
  }
}
