import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';

@UseGuards(AuthGuard)
@Controller('api/subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('me')
  async getMySubscription(@Req() req: ExtendedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.subscriptionService.getSubscriptionForUser(req.user.id);
  }

  @Post('checkout-session')
  async createCheckoutSession(
    @Body() body: { planProductId: string },
    @Req() req: ExtendedRequest,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const { planProductId } = body;
    return this.subscriptionService.createCheckoutSession(
      planProductId,
      user?.id,
    );
  }

  @Post('schedule-free')
  async scheduleFree(@Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    return this.subscriptionService.scheduleFreePlan(req.user.id);
  }

  @Post('cancel-pending-change')
  async cancelPendingChange(@Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    return this.subscriptionService.cancelPendingPlanChange(req.user.id);
  }
}
