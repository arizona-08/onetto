import { Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { PrismaService } from 'src/prisma/prisma.service';
import { SuperPdpIncomingInvoicesService } from './superpdp-incoming-invoices.service';

@UseGuards(AuthGuard)
@Controller('api/electronic-invoicing/superpdp/companies/:companyId/incoming-invoices')
export class SuperPdpIncomingInvoicesController {
  constructor(private readonly prisma: PrismaService, private readonly incoming: SuperPdpIncomingInvoicesService) {}
  private async assertAccess(companyId: string, userId: string) {
    const company = await this.prisma.company.findFirst({ where: { id: companyId, OR: [{ ownerId: userId }, { companyUsers: { some: { userId, role: 'ADMIN', isHidden: false } } }] }, select: { id: true } });
    if (!company) throw new UnauthorizedException('Accès non autorisé');
  }
  @Post('synchronize')
  async synchronize(@Param('companyId') companyId: string, @Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    await this.assertAccess(companyId, req.user.id);
    await this.incoming.synchronizeCompany(companyId);
    return { success: true };
  }
  @Get()
  async list(@Param('companyId') companyId: string, @Req() req: ExtendedRequest) {
    if (!req.user) throw new UnauthorizedException('Non authentifié');
    await this.assertAccess(companyId, req.user.id);
    return this.prisma.receivedElectronicInvoice.findMany({
      where: { companyId, company: { OR: [{ ownerId: req.user.id }, { companyUsers: { some: { userId: req.user.id, role: 'ADMIN', isHidden: false } } }] } },
      orderBy: { receivedAt: 'desc' }, take: 100,
    });
  }
}
