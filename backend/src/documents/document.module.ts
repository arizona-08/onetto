import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { DocumentController } from "./document.controller";
import { DocumentService } from "./document.service";
import { AuthModule } from "src/auth/auth.module";
import { JwtModule } from "@nestjs/jwt";
import { UserModule } from "src/user/user.module";
import { MailModule } from "src/mail/mail.module";
import { NegociationController } from "./negociation.controller";
import { InvoicePdfService } from "./invoice-pdf.service";
import { BridgeApiModule } from "src/bridgeApi/bridgeApi.module";

@Module({
  imports: [PrismaModule, UserModule, AuthModule, JwtModule, MailModule, BridgeApiModule],
  controllers: [DocumentController, NegociationController],
  providers: [DocumentService, InvoicePdfService],
})
export class DocumentModule {}
