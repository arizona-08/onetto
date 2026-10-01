import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { PlanAccessModule } from 'src/plan-access/plan-access.module';
import { MailModule } from 'src/mail/mail.module';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    SubscriptionModule,
    PlanAccessModule,
    MailModule,
  ],
  controllers: [AdminController],
  providers: [AdminBootstrapService, AdminService, AdminGuard],
})
export class AdminModule {}
