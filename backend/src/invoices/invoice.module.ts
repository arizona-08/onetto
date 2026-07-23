import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { InvoiceController } from "./invoice.controller";
import { InvoiceService } from "./invoice.service";
import { AuthModule } from "src/auth/auth.module";
import { JwtModule } from "@nestjs/jwt";
import { UserModule } from "src/user/user.module";

@Module({
  imports: [PrismaModule, UserModule, AuthModule, JwtModule],
  controllers: [InvoiceController],
  providers: [InvoiceService],
})
export class InvoiceModule {}