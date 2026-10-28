import { Module } from '@nestjs/common';
import { CompaniesModule } from 'src/companies/companies.module';
import { MailModule } from 'src/mail/mail.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { AccountClosureController } from './account-closure.controller';
import { AccountClosureService } from './account-closure.service';

@Module({
  imports: [PrismaModule, CompaniesModule, MailModule, UserModule],
  controllers: [AccountClosureController],
  providers: [AccountClosureService],
})
export class AccountClosureModule {}
