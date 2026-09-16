import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

type ReadinessStatus = 'ok' | 'degraded';
type CheckStatus = 'ok' | 'failed';

/**
 * Tables that must exist before this process may serve traffic. Kept small and
 * explicit: it is a deployment contract ("the release migration ran"), not a
 * full schema validator. `_prisma_migrations` is included so a database that
 * was created by hand, or whose migration history was lost, is also rejected.
 */
const ESSENTIAL_TABLES = [
  '_prisma_migrations',
  'Tenant',
  'Factory',
  'User',
  'UserCredential',
  'RefreshSession',
  'Permission',
  'PlatformAdmin',
] as const;

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
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

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
   * True only when every essential table exists AND at least one migration is
   * recorded as finished. A database that is reachable but empty (failed or
   * skipped release migration) therefore fails readiness instead of serving
   * traffic against a schema the application cannot use.
   *
   * Only a boolean ever reaches the response: no table names, row counts or
   * driver errors are exposed to an unauthenticated caller.
   */
  private async hasEssentialSchema(): Promise<boolean> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT "table_name"
        FROM "information_schema"."tables"
        WHERE "table_schema" = current_schema()
      `;
      const present = new Set(rows.map((row) => row.table_name));

      for (const table of ESSENTIAL_TABLES) {
        if (!present.has(table)) {
          return false;
        }
      }

      const [migrations] = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "_prisma_migrations"
        WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL
      `;

      return Number(migrations?.count ?? 0) > 0;
    } catch {
      return false;
    }
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
