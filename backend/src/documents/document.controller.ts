import { Body, Controller, Get, Param, Post, Put, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { DocumentService } from "./document.service";
import { CreateDocumentDto } from "./dtos/create-document.dto";
import type { ExtendedRequest, User } from "src/types/extended-request.types";
import { AuthGuard } from "src/auth/auth.guard";

@UseGuards(AuthGuard)
@Controller("api/documents")
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService
  ) {}

  @Get("mines")
  async getMyDocuments(@Req() req: ExtendedRequest, @Query("with-services") withServices: boolean) {
    const user = req.user;
    if(!user){
      throw new UnauthorizedException("Non authentifié");
    }

    return await this.documentService.getDocumentsByUser(user, withServices);
  }

  @Get(":documentId")
  async getDocumentById(@Param("documentId") documentId: string, @Query("with-services") withServices: boolean, @Req() req: ExtendedRequest) {
    const user = req.user;
    if(!user){
      throw new UnauthorizedException("Non authentifié");
    }

    return await this.documentService.getDocumentById(documentId, user, withServices);

  }

  @Post("create")
  async createDocument(@Body() body: CreateDocumentDto, @Req() req: ExtendedRequest){
    const user = req.user;
    return await this.documentService.createDocument(body, user as User);
  }

  @Put(":documentId/update-draft")
  async updateDraftDocument(@Body() body: CreateDocumentDto, @Param("documentId") documentId: string, @Req() req: ExtendedRequest ){
    const user = req.user;
    return await this.documentService.updateDraftDocument(documentId, body, user as User)
  }
}
