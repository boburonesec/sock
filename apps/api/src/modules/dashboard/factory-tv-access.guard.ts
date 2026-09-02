import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';
import { FactoryTvContextService } from './factory-tv-context.service';
import { FactoryTvCredentialService } from './factory-tv-credential.service';

export interface FactoryTvRequest extends Request {
  factoryTvContext?: { tenantId: string; factoryId: string };
}

/**
 * Accepts either a per-factory DB credential (real multi-tenant deployments —
 * each factory generates its own token in Settings) or the legacy shared
 * FACTORY_TV_ACCESS_TOKEN env var (dev/CI convenience, resolved to whichever
 * single factory FactoryTvContextService can identify). Whichever one
 * matches, the resolved {tenantId, factoryId} is attached to the request so
 * the controller never has to guess which credential type was used.
 */
@Injectable()
export class FactoryTvAccessGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly credentialService: FactoryTvCredentialService,
    private readonly factoryTvContext: FactoryTvContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FactoryTvRequest>();
    const providedToken = this.readHeader(request, 'x-factory-tv-token');

    if (!providedToken) {
      throw new UnauthorizedException('Factory TV access token is required.');
    }

    const dbMatch = await this.credentialService.resolveByToken(providedToken);
    if (dbMatch) {
      request.factoryTvContext = dbMatch;
      return true;
    }

    const legacyToken = this.configService.get<string>('factoryTv.accessToken');
    if (legacyToken && this.safeEquals(providedToken, legacyToken)) {
      request.factoryTvContext = await this.factoryTvContext.getFactoryContext();
      return true;
    }

    throw new UnauthorizedException('Factory TV access token is required.');
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
