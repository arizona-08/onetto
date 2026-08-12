import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
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
  async getMyDocuments(
    @Req() req: ExtendedRequest,
    @Query("with-services") withServices: boolean,
    @Query('type') type?: 'INVOICE' | 'ESTIMATE',
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const user = req.user;
    if(!user){
      throw new UnauthorizedException("Non authentifié");
    }

    return await this.documentService.getDocumentsByUser(
      user,
      withServices,
      type,
      status,
      Number(page) || 1,
      Number(pageSize) || 5,
    );
  }

  @Get(":documentId")
  async getDocumentById(@Param("documentId") documentId: string, @Query("with-services") withServices: boolean, @Req() req: ExtendedRequest) {
    const user = req.user;
    if(!user){
      throw new UnauthorizedException("Non authentifié");
    }

    return await this.documentService.getDocumentById(documentId, user, withServices);

  }

  @Get(":documentId/negociations")
  async getDocumentNegociations(@Param("documentId") documentId: string, @Req() req: ExtendedRequest) {
    const user = req.user;
    if(!user){
      throw new UnauthorizedException("Non authentifié");
    }

    return await this.documentService.getNegociationsByDocument(documentId, user);
  }

  @Get(":documentId/versions")
  async getDocumentVersions(@Param("documentId") documentId: string, @Req() req: ExtendedRequest) {
    const user = req.user;
    if(!user){
      throw new UnauthorizedException("Non authentifié");
    }

    return await this.documentService.getDocumentVersions(documentId, user);
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
  
  @Delete("mass-delete")
  async massDeleteDocuments(@Body("documentIds") documentIds: string[], @Req() req: ExtendedRequest) {
    const user = req.user;
    if(!user){
      throw new UnauthorizedException("Non authentifié");
    }
  
    return await this.documentService.massDeleteDocuments(documentIds, user);
  }

  @Post(":documentId/send-to-client")
  async sendDocumentToClient(@Param("documentId") documentId: string, @Req() req: ExtendedRequest) {
    const user = req.user;
    if(!user){
      throw new UnauthorizedException("Non authentifié");
    }

    return await this.documentService.sendDocumentToClient(documentId, user);
  }

  @Post(":documentId/retry-payment")
  async retryInvoicePayment(@Param("documentId") documentId: string, @Req() req: ExtendedRequest) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException("Non authentifié");
    }

    return await this.documentService.retryInvoicePayment(documentId, user);
  }

  @Post(":documentId/create-version")
  async createDocumentVersion(@Param("documentId") documentId: string, @Req() req: ExtendedRequest) {
    const user = req.user;
    if(!user){
      throw new UnauthorizedException("Non authentifié");
    }

    return await this.documentService.createNewDocumentVersion(documentId, user);
  }

  @Post(":estimateId/turn-into-invoice")
  async turnEstimateIntoInvoice(@Param("estimateId") estimateId: string, @Req() req: ExtendedRequest) {
    const user = req.user;
    if(!user){
      throw new UnauthorizedException("Non authentifié");
    }

    return await this.documentService.convertEstimateToInvoice(estimateId, user);
  }
}
  
