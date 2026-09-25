import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
@Module({ imports: [PrismaModule, AuthModule], controllers: [AdminController], providers: [AdminService, AdminGuard] })
export class AdminModule {}
