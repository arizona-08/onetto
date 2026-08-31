import { Controller, Get, Param, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { NotificationsService } from './notifications.service';

@UseGuards(AuthGuard)
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@Req() req: ExtendedRequest) { if (!req.user) throw new UnauthorizedException('Non authentifié'); return this.notifications.listForUser(req.user.id); }
  @Put(':id/read') markRead(@Param('id') id: string, @Req() req: ExtendedRequest) { if (!req.user) throw new UnauthorizedException('Non authentifié'); return this.notifications.markRead(req.user.id, id); }
}
