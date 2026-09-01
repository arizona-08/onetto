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
import { SuperPdpDirectoryController } from './superpdp-directory.controller';
import { SuperPdpDirectoryService } from './superpdp-directory.service';
import { SuperPdpB2bController } from './superpdp-b2b.controller';
import { SuperPdpB2bService } from './superpdp-b2b.service';
import { SuperPdpSynchronizationService } from './superpdp-synchronization.service';
import { SuperPdpIncomingInvoicesService } from './superpdp-incoming-invoices.service';
import { SuperPdpIncomingInvoicesController } from './superpdp-incoming-invoices.controller';
import { ElectronicInvoiceValidationService } from './electronic-invoice-validation.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [PrismaModule, UserModule, PdfModule, NotificationsModule, StorageModule],
  controllers: [SuperPdpOAuthController, SuperPdpEreportingController, FacturXController, SuperPdpDirectoryController, SuperPdpB2bController, SuperPdpIncomingInvoicesController],
  providers: [
    ElectronicInvoicingClassifierService,
    SuperPdpOAuthService,
    SuperPdpTokenCryptoService,
    SuperPdpEreportingService,
    FacturXService,
    SuperPdpDirectoryService,
    SuperPdpB2bService,
    SuperPdpSynchronizationService,
    SuperPdpIncomingInvoicesService,
    ElectronicInvoiceValidationService,
  ],
  exports: [ElectronicInvoicingClassifierService, SuperPdpOAuthService, SuperPdpEreportingService, FacturXService, SuperPdpB2bService],
})
export class ElectronicInvoicingModule {}
