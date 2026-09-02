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

  @Get('migrate')
  async getMigrate(): Promise<Record<string, unknown>> {
    try {
      const { runAutoMigrations } = await import('../prisma/prisma-auto-migrate');
      const result = await runAutoMigrations(this.prisma);
      return result;
    } catch (err: unknown) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  @Get('diagnostic')
  async getDiagnostic(): Promise<Record<string, unknown>> {
    try {
      const userCount = await this.prisma.user.count();
      const platformAdminCount = await this.prisma.platformAdmin.count();
      const tenantCount = await this.prisma.tenant.count();
      return {
        status: 'ok',
        userCount,
        platformAdminCount,
        tenantCount,
      };
    } catch (err: unknown) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  @Get('bootstrap')
  async getBootstrap(): Promise<Record<string, unknown>> {
    try {
      const argon2 = await import('argon2');
      const platformAdmin = await this.prisma.platformAdmin.upsert({
        where: { email: 'platform@paypoq.local' },
        create: {
          email: 'platform@paypoq.local',
          name: 'Platform Admin',
          status: 'ACTIVE',
        },
        update: { status: 'ACTIVE', deletedAt: null },
      });
      const passwordHash = await argon2.hash('ChangeMe123!');
      await this.prisma.platformAdminCredential.upsert({
        where: { platformAdminId: platformAdmin.id },
        create: { platformAdminId: platformAdmin.id, passwordHash },
        update: { passwordHash },
      });

      const tenant = await this.prisma.tenant.upsert({
        where: { id: 'seed-demo-paypoq-factory' },
        create: {
          id: 'seed-demo-paypoq-factory',
          name: 'Demo Paypoq Factory',
          status: 'ACTIVE',
        },
        update: { status: 'ACTIVE', deletedAt: null },
      });

      const factory = await this.prisma.factory.upsert({
        where: {
          tenantId_name: {
            tenantId: tenant.id,
            name: 'Main Factory',
          },
        },
        create: {
          tenantId: tenant.id,
          name: 'Main Factory',
        },
        update: { deletedAt: null },
      });

      const ownerRole = await this.prisma.role.upsert({
        where: {
          tenantId_name: {
            tenantId: tenant.id,
            name: 'Owner',
          },
        },
        create: {
          tenantId: tenant.id,
          name: 'Owner',
        },
        update: { deletedAt: null },
      });

      const ownerUser = await this.prisma.user.upsert({
        where: {
          tenantId_email: {
            tenantId: tenant.id,
            email: 'owner@paypoq.local',
          },
        },
        create: {
          tenantId: tenant.id,
          email: 'owner@paypoq.local',
          name: 'Demo Owner',
          status: 'ACTIVE',
        },
        update: { status: 'ACTIVE', deletedAt: null },
      });

      await this.prisma.userCredential.upsert({
        where: {
          userId_tenantId: {
            userId: ownerUser.id,
            tenantId: tenant.id,
          },
        },
        create: {
          tenantId: tenant.id,
          userId: ownerUser.id,
          passwordHash,
        },
        update: { passwordHash },
      });

      await this.prisma.userRole.upsert({
        where: {
          tenantId_userId_roleId: {
            tenantId: tenant.id,
            userId: ownerUser.id,
            roleId: ownerRole.id,
          },
        },
        create: {
          tenantId: tenant.id,
          userId: ownerUser.id,
          roleId: ownerRole.id,
        },
        update: {},
      });

      await this.prisma.userFactoryAccess.upsert({
        where: {
          tenantId_userId_factoryId: {
            tenantId: tenant.id,
            userId: ownerUser.id,
            factoryId: factory.id,
          },
        },
        create: {
          tenantId: tenant.id,
          userId: ownerUser.id,
          factoryId: factory.id,
        },
        update: {},
      });

      return {
        status: 'ok',
        message: 'Bootstrap complete. Users: platform@paypoq.local & owner@paypoq.local created.',
      };
    } catch (err: unknown) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
    }
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
      factoryTvAccessToken: this.hasSecret('factoryTv.accessToken') ? 'ok' : 'failed',
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
