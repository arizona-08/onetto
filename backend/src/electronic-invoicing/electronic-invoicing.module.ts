import { Module } from '@nestjs/common';
import { ElectronicInvoicingClassifierService } from './electronic-invoicing-classifier.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SuperPdpOAuthController } from './superpdp-oauth.controller';
import { SuperPdpOAuthService } from './superpdp-oauth.service';
import { SuperPdpTokenCryptoService } from './superpdp-token-crypto.service';
import { SuperPdpEreportingController } from './superpdp-ereporting.controller';
import { SuperPdpEreportingService } from './superpdp-ereporting.service';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [SuperPdpOAuthController, SuperPdpEreportingController],
  providers: [
    ElectronicInvoicingClassifierService,
    SuperPdpOAuthService,
    SuperPdpTokenCryptoService,
    SuperPdpEreportingService,
  ],
  exports: [ElectronicInvoicingClassifierService, SuperPdpOAuthService],
})
export class ElectronicInvoicingModule {}
