import { Body, Controller, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { SubscriptionService } from "./subscription.service";
import { AuthGuard } from "src/auth/auth.guard";
import type { ExtendedRequest } from "src/types/extended-request.types";
import { PrismaService } from "src/prisma/prisma.service";

@UseGuards(AuthGuard)
@Controller('api/subscriptions')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService
  ) {}

  @Post('checkout-session')
  async createCheckoutSession(@Body() body: { planProductId: string }, @Req() req: ExtendedRequest) {
    const user = req.user;
    if(!user){
      throw new UnauthorizedException("User not authenticated");
    }

    const { planProductId } = body;
    return this.subscriptionService.createCheckoutSession(planProductId, user?.id);
  }

  
}