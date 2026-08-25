import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { SubscriptionService } from "./subscription.service";
import { AuthGuard } from "src/auth/auth.guard";

@UseGuards(AuthGuard)
@Controller('api/subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('checkout-session')
  async createCheckoutSession(@Body() body: { planProductId: string }) {
    const { planProductId } = body;
    return this.subscriptionService.createCheckoutSession(planProductId);
  }

  
}