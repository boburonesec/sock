import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RequestWithContext } from '../request-context/request-context.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & RequestWithContext>();
    const authorization = request.header('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Kirish tokeni yo‘q. Qayta kiring.');
    }

    const accessToken = authorization.slice('Bearer '.length).trim();

    if (!accessToken) {
      throw new UnauthorizedException('Kirish tokeni yo‘q. Qayta kiring.');
    }

    const factoryId = request.header('x-factory-id')?.trim() || undefined;
    request.requestContext = await this.authService.getContextFromAccessToken(accessToken, factoryId);

    return true;
  }
}

