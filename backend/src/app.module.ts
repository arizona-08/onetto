import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { DocumentModule } from './documents/document.module';
import { CompaniesModule } from './companies/companies.module';
import { MailModule } from './mail/mail.module';
import { BridgeApiModule } from './bridgeApi/bridgeApi.module';
import { BridgeWebhookModule } from './bridgeWebhooks/bridgeWebhook.module';

@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    DocumentModule,
    CompaniesModule,
    MailModule, // custom mail module for sending emails
    BridgeApiModule,
    BridgeWebhookModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
