import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dtos/create-document.dto';
import { SendDocumentToClientDto } from './dtos/send-document-to-client.dto';
import type { ExtendedRequest, User } from 'src/types/extended-request.types';
import { AuthGuard } from 'src/auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('api/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get('mines')
  async getMyDocuments(
    @Req() req: ExtendedRequest,
    @Query('with-services') withServices: boolean,
    @Query('type') type?: 'INVOICE' | 'ESTIMATE',
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Non authentifié');
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

  @Get('invoice-stats')
  async getInvoiceStats(@Req() req: ExtendedRequest) {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('Non authentifié');
    }

    return this.documentService.getInvoiceStats(user);
  }

  @Get('dashboard-summary')
  async getDashboardSummary(@Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    return this.documentService.getDashboardSummary(req.user);
  }

  @Get('dashboard-advanced')
  async getAdvancedDashboard(@Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    return this.documentService.getAdvancedDashboard(req.user);
  }

  @Get('dashboard-pro')
  async getProDashboard(@Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    return this.documentService.getProDashboard(req.user);
  }

  @Get('cashflow-forecast')
  async getCashflowForecast(@Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    return this.documentService.getCashflowForecast(req.user);
  }

  @Get(':documentId')
  async getDocumentById(
    @Param('documentId') documentId: string,
    @Query('with-services') withServices: boolean,
    @Req() req: ExtendedRequest,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Non authentifié');
    }

    return await this.documentService.getDocumentById(
      documentId,
      user,
      withServices,
    );
  }

  @Get(':documentId/download-pdf')
  async downloadDocumentPdf(
    @Param('documentId') documentId: string,
    @Req() req: ExtendedRequest,
    @Res() res: Response,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Non authentifié');
    }

    const pdf = await this.documentService.generateDocumentPdf(
      documentId,
      user,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="document-${documentId}.pdf"`,
    );
    res.send(pdf);
  }

  @Get(':documentId/negociations')
  async getDocumentNegociations(
    @Param('documentId') documentId: string,
    @Req() req: ExtendedRequest,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Non authentifié');
    }

    return await this.documentService.getNegociationsByDocument(
      documentId,
      user,
    );
  }

  @Get(':documentId/versions')
  async getDocumentVersions(
    @Param('documentId') documentId: string,
    @Req() req: ExtendedRequest,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Non authentifié');
    }

    return await this.documentService.getDocumentVersions(documentId, user);
  }

  @Post('create')
  async createDocument(
    @Body() body: CreateDocumentDto,
    @Req() req: ExtendedRequest,
  ) {
    const user = req.user;
    return await this.documentService.createDocument(body, user as User);
  }

  @Put(':documentId/update-draft')
  async updateDraftDocument(
    @Body() body: CreateDocumentDto,
    @Param('documentId') documentId: string,
    @Req() req: ExtendedRequest,
  ) {
    const user = req.user;
    return await this.documentService.updateDraftDocument(
      documentId,
      body,
      user as User,
    );
  }

  @Delete('mass-delete')
  async massDeleteDocuments(
    @Body('documentIds') documentIds: string[],
    @Req() req: ExtendedRequest,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Non authentifié');
    }

    return await this.documentService.massDeleteDocuments(documentIds, user);
  }

  @Post(':documentId/send-to-client')
  async sendDocumentToClient(
    @Param('documentId') documentId: string,
    @Body() body: SendDocumentToClientDto,
    @Req() req: ExtendedRequest,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Non authentifié');
    }

    return await this.documentService.sendDocumentToClient(
      documentId,
      user,
      body,
    );
  }

  @Post(':documentId/retry-payment')
  async retryInvoicePayment(
    @Param('documentId') documentId: string,
    @Req() req: ExtendedRequest,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Non authentifié');
    }

    return await this.documentService.retryInvoicePayment(documentId, user);
  }

  @Post(':documentId/create-version')
  async createDocumentVersion(
    @Param('documentId') documentId: string,
    @Req() req: ExtendedRequest,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Non authentifié');
    }

    return await this.documentService.createNewDocumentVersion(
      documentId,
      user,
    );
  }

  @Post(':estimateId/turn-into-invoice')
  async turnEstimateIntoInvoice(
    @Param('estimateId') estimateId: string,
    @Req() req: ExtendedRequest,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Non authentifié');
    }

    return await this.documentService.convertEstimateToInvoice(
      estimateId,
      user,
    );
  }

  @Put(':invoiceId/mark-as-paid-manually')
  async markAsPaidManually(
    @Param('invoiceId') invoiceId: string,
    @Req() req: ExtendedRequest,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Non authentifié');
    }

    return await this.documentService.manuallyMarkInvoiceAsPaid(
      invoiceId,
      user,
    );
  }

  @Put(':invoiceId/mark-as-pending-manually')
  async markAsPendingManually(
    @Param('invoiceId') invoiceId: string,
    @Req() req: ExtendedRequest,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Non authentifié');
    }

    return await this.documentService.manuallyMarkInvoiceAsPending(
      invoiceId,
      user,
    );
  }
}
