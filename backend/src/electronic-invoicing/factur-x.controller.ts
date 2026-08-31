import { Controller, Get, Param, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { FacturXService } from './factur-x.service';
@UseGuards(AuthGuard) @Controller('api/electronic-invoicing/factur-x')
export class FacturXController { constructor(private readonly facturX: FacturXService) {} @Get('documents/:documentId/download') async download(@Param('documentId') id: string, @Req() req: ExtendedRequest, @Res() res: Response) { if (!req.user) throw new UnauthorizedException('Non authentifié'); const file = await this.facturX.generate(id, req.user); res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="factur-x-${id}.pdf"`); res.send(file); } }
