import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { UserModule } from "src/user/user.module";
import { PlanAccessModule } from 'src/plan-access/plan-access.module';
import { CompaniesController } from "./companies.controller";
import { CompaniesService } from "./companies.service";

@Module({
  imports: [PrismaModule, AuthModule, UserModule, PlanAccessModule],
  controllers: [CompaniesController],
  providers: [CompaniesService]
})
export class CompaniesModule {}
