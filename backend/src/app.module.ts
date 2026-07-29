import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { DocumentModule } from './documents/document.module';
import { CompaniesModule } from './companies/companies.module';

@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    DocumentModule,
    CompaniesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
