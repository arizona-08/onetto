import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { AuthModule } from 'src/auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from 'src/user/user.module';
import { MailModule } from 'src/mail/mail.module';
import { NegociationController } from './negociation.controller';
import { PublicPaymentController } from './public-payment.controller';
import { PaymentProviderModule } from 'src/Adapters/PaymentAdapters/payment-provider.module';
import { ConfigModule } from '@nestjs/config';
import { PdfModule } from 'src/pdf/pdf.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    UserModule,
    AuthModule,
    JwtModule,
    MailModule,
    PdfModule,
    PaymentProviderModule,
  ],
  controllers: [
    DocumentController,
    NegociationController,
    PublicPaymentController,
  ],
  providers: [DocumentService],
})
export class DocumentModule {}
