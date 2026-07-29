import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { DocumentController } from "./document.controller";
import { DocumentService } from "./document.service";
import { AuthModule } from "src/auth/auth.module";
import { JwtModule } from "@nestjs/jwt";
import { UserModule } from "src/user/user.module";

@Module({
  imports: [PrismaModule, UserModule, AuthModule, JwtModule],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}