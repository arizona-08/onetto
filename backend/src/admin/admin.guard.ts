import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { AppUserRole } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ExtendedRequest>();
    if (
      request.user?.appUserRole !== AppUserRole.ADMIN &&
      request.user?.appUserRole !== AppUserRole.SUPERADMIN
    )
      throw new ForbiddenException('Accès administrateur requis.');
    return true;
  }
}
