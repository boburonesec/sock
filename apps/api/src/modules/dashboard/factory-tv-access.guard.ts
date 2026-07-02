import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class FactoryTvAccessGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedToken = this.configService.get<string>('factoryTv.accessToken');
    const providedToken = this.readHeader(request, 'x-factory-tv-token');

    if (!expectedToken || !providedToken || !this.safeEquals(providedToken, expectedToken)) {
      throw new UnauthorizedException('Factory TV access token is required.');
    }

    return true;
  }

  private readHeader(request: Request, headerName: string): string | undefined {
    const value = request.headers[headerName];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private safeEquals(providedToken: string, expectedToken: string): boolean {
    const providedBuffer = Buffer.from(providedToken);
    const expectedBuffer = Buffer.from(expectedToken);

    return (
      providedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(providedBuffer, expectedBuffer)
    );
  }
}
