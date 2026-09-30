import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { checkSchemaCompatibility, loadBuildMigrations } from './schema-compatibility';

type ReadinessStatus = 'ok' | 'degraded';
type CheckStatus = 'ok' | 'failed';

/**
 * Public health surface. Deliberately limited to two read-only routes:
 *
 * - GET /health            liveness: the process is up (no database access)
 * - GET /health/readiness  readiness: safe to receive traffic
 *
 * There is intentionally no HTTP route that can run migrations, create or
 * reset a platform admin, seed demo data, or disclose tenant/user counts.
 * Migrations are an explicit release step (`prisma migrate deploy`) and the
 * first platform admin is created by an operator CLI
 * (`pnpm --filter @paypoq/api bootstrap:platform-admin`).
 */
@Controller('health')
export class HealthController {
  /** Migrations shipped with this build; fixed for the life of the process. */
  private readonly expectedMigrations: string[] | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.expectedMigrations = loadBuildMigrations();
  }

  @Get()
  getHealth(): {
    status: 'ok';
    service: 'paypoq-os-api';
    version: string;
  } {
    return {
      status: 'ok',
      service: 'paypoq-os-api',
      // Non-secret build identifier so an operator can confirm which commit is
      // running. Empty/unset in local development.
      version: this.configService.get<string>('app.buildSha', 'unknown'),
    };
  }

  @Get('readiness')
  async getReadiness(): Promise<{
    status: ReadinessStatus;
    service: 'paypoq-os-api';
    version: string;
    checks: Record<string, CheckStatus>;
  }> {
    const checks: Record<string, CheckStatus> = {
      database: 'ok',
      schema: 'ok',
      jwtConfig: this.hasSecret('auth.jwtAccessSecret') ? 'ok' : 'failed',
      platformJwtConfig: this.hasSecret('platformAuth.jwtAccessSecret') ? 'ok' : 'failed',
      botInternalApiKey: this.hasSecret('bot.internalApiKey') ? 'ok' : 'failed',
      factoryTvAccessToken: this.hasSecret('factoryTv.accessToken') ? 'ok' : 'failed',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.database = 'failed';
      checks.schema = 'failed';
    }

    if (checks.database === 'ok') {
      checks.schema = (await this.hasEssentialSchema()) ? 'ok' : 'failed';
    }

    const status: ReadinessStatus = Object.values(checks).every(
      (check) => check === 'ok',
    )
      ? 'ok'
      : 'degraded';

    const response = {
      status,
      service: 'paypoq-os-api' as const,
      version: this.configService.get<string>('app.buildSha', 'unknown'),
      checks,
    };

    if (status !== 'ok') {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  /**
   * True only when the schema matches this build: essential tables exist, no
   * migration is failed/unfinished, and every migration shipped with the build
   * is applied (shared with the production startup gate). A failed, partially
   * applied or skipped release migration therefore fails readiness.
   *
   * Only a boolean ever reaches the response: no table names, migration names,
   * row counts or driver errors are exposed to an unauthenticated caller.
   */
  private async hasEssentialSchema(): Promise<boolean> {
    const result = await checkSchemaCompatibility(this.prisma, this.expectedMigrations);
    return result.ok;
  }

  private hasSecret(configPath: string): boolean {
    const value = this.configService.get<string>(configPath);
    if (typeof value !== 'string') {
      return false;
    }

    const isProduction =
      this.configService.get<string>('app.nodeEnv') === 'production';
    const minLength = isProduction ? 32 : 16;
    if (value.length < minLength) {
      return false;
    }

    // Fail readiness if a known placeholder leaked into production config.
    if (
      isProduction &&
      /(change-?me|local-development|local-ci|replace-with)/i.test(value)
    ) {
      return false;
    }

    return true;
  }
}
