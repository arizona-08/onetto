import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PlanAccessService } from './plan-access.service';

@Module({
  imports: [PrismaModule],
  providers: [PlanAccessService],
  exports: [PlanAccessService],
})
export class PlanAccessModule {}
