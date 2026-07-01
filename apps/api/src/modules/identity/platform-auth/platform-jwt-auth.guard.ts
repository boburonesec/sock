import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PlatformAuthService } from './platform-auth.service';
import { RequestWithPlatformAdmin } from './platform-auth.types';

@Injectable()
export class PlatformJwtAuthGuard implements CanActivate {
  constructor(private readonly platformAuthService: PlatformAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & RequestWithPlatformAdmin>();
    const authorization = request.header('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing platform access token.');
    }

    const accessToken = authorization.slice('Bearer '.length).trim();

    if (!accessToken) {
      throw new UnauthorizedException('Missing platform access token.');
    }

    request.platformAdminContext =
      await this.platformAuthService.getContextFromAccessToken(accessToken);

    return true;
  }
}
