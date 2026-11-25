import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { PlanAccessModule } from 'src/plan-access/plan-access.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompanyLogoController } from './company-logo.controller';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    PlanAccessModule,
    StorageModule,
  ],
  controllers: [CompaniesController, CompanyLogoController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
