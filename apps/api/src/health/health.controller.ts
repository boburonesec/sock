import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

type ReadinessStatus = 'ok' | 'degraded';
type CheckStatus = 'ok' | 'failed';

@Controller('health')
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHealth(): { status: 'ok'; service: 'paypoq-os-api' } {
    return {
      status: 'ok',
      service: 'paypoq-os-api',
    };
  }

  @Get('readiness')
  async getReadiness(): Promise<{
    status: ReadinessStatus;
    service: 'paypoq-os-api';
    checks: Record<string, CheckStatus>;
  }> {
    const checks: Record<string, CheckStatus> = {
      database: 'ok',
      jwtConfig: this.hasSecret('auth.jwtAccessSecret') ? 'ok' : 'failed',
      platformJwtConfig: this.hasSecret('platformAuth.jwtAccessSecret') ? 'ok' : 'failed',
      botInternalApiKey: this.hasSecret('bot.internalApiKey') ? 'ok' : 'failed',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.database = 'failed';
    }

    const status: ReadinessStatus = Object.values(checks).every(
      (check) => check === 'ok',
    )
      ? 'ok'
      : 'degraded';

    const response = {
      status,
      service: 'paypoq-os-api' as const,
      checks,
    };

    if (status !== 'ok') {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  private hasSecret(configPath: string): boolean {
    const value = this.configService.get<string>(configPath);

    return typeof value === 'string' && value.length >= 16;
  }
}
