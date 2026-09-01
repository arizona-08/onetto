import { Controller, Get, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import type { ExtendedRequest } from 'src/types/extended-request.types';

@UseGuards(AuthGuard)
@Controller('api/archives')
export class ArchiveController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: ExtendedRequest, @Query('companyId') companyId?: string, @Query('q') q = '') {
    if (!req.user || !companyId) throw new UnauthorizedException('Entreprise non sélectionnée.');
    const access = { companyId, company: { OR: [{ ownerId: req.user.id }, { companyUsers: { some: { userId: req.user.id } } }] } };
    const term = q.trim();
    const [issued, received] = await Promise.all([
      this.prisma.document.findMany({ where: { ...access, facturXArchiveKey: { not: null }, ...(term ? { OR: [{ documentNumber: { contains: term, mode: 'insensitive' } }, { clientName: { contains: term, mode: 'insensitive' } }] } : {}) }, select: { id: true, documentNumber: true, clientName: true, facturXArchiveKey: true, facturXContentSha256: true, facturXArchivedAt: true }, take: 100 }),
      this.prisma.receivedElectronicInvoice.findMany({ where: { ...access, originalArchiveKey: { not: null }, ...(term ? { OR: [{ invoiceNumber: { contains: term, mode: 'insensitive' } }, { supplierName: { contains: term, mode: 'insensitive' } }] } : {}) }, select: { id: true, invoiceNumber: true, supplierName: true, originalArchiveKey: true, originalSha256: true, originalArchivedAt: true }, take: 100 }),
    ]);
    return [...issued.map((item) => ({ ...item, kind: 'ISSUED_FACTUR_X', name: item.clientName, number: item.documentNumber, key: item.facturXArchiveKey, sha256: item.facturXContentSha256, archivedAt: item.facturXArchivedAt })), ...received.map((item) => ({ ...item, kind: 'SUPPLIER_ORIGINAL', name: item.supplierName, number: item.invoiceNumber, key: item.originalArchiveKey, sha256: item.originalSha256, archivedAt: item.originalArchivedAt }))].sort((a, b) => (b.archivedAt?.getTime() ?? 0) - (a.archivedAt?.getTime() ?? 0));
  }
}
