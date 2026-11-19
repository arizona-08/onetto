import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { PrismaService } from 'src/prisma/prisma.service';
import { SuperPdpIncomingInvoicesService } from './superpdp-incoming-invoices.service';

@UseGuards(AuthGuard)
@Controller(
  'api/electronic-invoicing/superpdp/companies/:companyId/incoming-invoices',
)
export class SuperPdpIncomingInvoicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly incoming: SuperPdpIncomingInvoicesService,
  ) {}
  private async assertAccess(companyId: string, userId: string) {
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        status: 'ACTIVE',
        OR: [
          { ownerId: userId },
          {
            companyUsers: { some: { userId, role: 'ADMIN', isHidden: false } },
          },
        ],
      },
      select: { id: true },
    });
    if (!company) throw new UnauthorizedException('Accès non autorisé');
  }
  @Post('synchronize')
  async synchronize(
    @Param('companyId') companyId: string,
    @Req() req: ExtendedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    await this.assertAccess(companyId, req.user.id);
    await this.incoming.synchronizeCompany(companyId);
    return { success: true };
  }
  @Get()
  async list(
    @Param('companyId') companyId: string,
    @Req() req: ExtendedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    await this.assertAccess(companyId, req.user.id);
    return this.prisma.receivedElectronicInvoice.findMany({
      where: {
        companyId,
        company: {
          status: 'ACTIVE',
          OR: [
            { ownerId: req.user.id },
            {
              companyUsers: {
                some: { userId: req.user.id, role: 'ADMIN', isHidden: false },
              },
            },
          ],
        },
      },
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });
  }

  @Get(':invoiceId/download')
  async download(
    @Param('companyId') companyId: string,
    @Param('invoiceId') invoiceId: string,
    @Query('format') format: string | undefined,
    @Req() req: ExtendedRequest,
    @Res() response: Response,
  ) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    await this.assertAccess(companyId, req.user.id);
    if (format && format !== 'pdf' && format !== 'original') {
      throw new BadRequestException('Format de téléchargement invalide.');
    }
    const requestedFormat = format === 'pdf' ? 'pdf' : 'original';
    const file = await this.incoming.downloadInvoice(
      companyId,
      invoiceId,
      requestedFormat,
    );
    response.setHeader('Content-Type', file.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );
    response.send(file.buffer);
  }
}
