import { Module } from '@nestjs/common';
import { ElectronicInvoicingClassifierService } from './electronic-invoicing-classifier.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SuperPdpOAuthController } from './superpdp-oauth.controller';
import { SuperPdpOAuthService } from './superpdp-oauth.service';
import { SuperPdpTokenCryptoService } from './superpdp-token-crypto.service';
import { SuperPdpEreportingController } from './superpdp-ereporting.controller';
import { SuperPdpEreportingService } from './superpdp-ereporting.service';
import { UserModule } from 'src/user/user.module';
import { PdfModule } from 'src/pdf/pdf.module';
import { FacturXController } from './factur-x.controller';
import { FacturXService } from './factur-x.service';

@Module({
  imports: [PrismaModule, UserModule, PdfModule],
  controllers: [SuperPdpOAuthController, SuperPdpEreportingController, FacturXController],
  providers: [
    ElectronicInvoicingClassifierService,
    SuperPdpOAuthService,
    SuperPdpTokenCryptoService,
    SuperPdpEreportingService,
    FacturXService,
  ],
  exports: [ElectronicInvoicingClassifierService, SuperPdpOAuthService, FacturXService],
})
export class ElectronicInvoicingModule {}
