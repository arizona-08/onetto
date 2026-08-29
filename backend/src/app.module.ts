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
import { PaymentProviderModule } from './Adapters/PaymentAdapters/payment-provider.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AutomaticRemindersModule } from './automatic-reminders-cron/automatic-remineders.module';
import { ElectronicInvoicingModule } from './electronic-invoicing/electronic-invoicing.module';
import { validateSuperPdpConfiguration } from './electronic-invoicing/superpdp.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateSuperPdpConfiguration,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    DocumentModule,
    CompaniesModule,
    MailModule, // custom mail module for sending emails
    PaymentProviderModule,
    SubscriptionModule,
    AutomaticRemindersModule,
    ElectronicInvoicingModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
