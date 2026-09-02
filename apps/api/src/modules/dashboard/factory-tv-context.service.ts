import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface FactoryTvContext {
  tenantId: string;
  factoryId: string;
}

/**
 * Resolves which tenant/factory the single shared Factory TV token serves.
 *
 * Factory TV has no per-viewer login — one bearer token (FACTORY_TV_ACCESS_TOKEN)
 * grants read access to exactly one factory's floor summary. Previously this
 * resolver was hard-coded to the deterministic demo seed's tenant ("Main
 * Factory"), which meant Factory TV silently never worked for any real
 * customer tenant (their id/name never matches the demo literal) and — had a
 * matching tenant ever existed — would have leaked that tenant's data to
 * anyone holding the token, regardless of who they were.
 *
 * FACTORY_TV_TENANT_ID / FACTORY_TV_FACTORY_ID make the target explicit and
 * are required in production (see env.validation.ts). Outside production,
 * when unset, this auto-detects a single active tenant/factory — safe for
 * dev/CI/demo, where exactly one is ever seeded — and refuses to guess the
 * moment a second tenant exists, rather than risk serving the wrong one.
 */
@Injectable()
export class FactoryTvContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getFactoryContext(): Promise<FactoryTvContext> {
    const configuredTenantId = this.configService.get<string>('factoryTv.tenantId');
    const configuredFactoryId = this.configService.get<string>('factoryTv.factoryId');

    if (configuredTenantId && configuredFactoryId) {
      const factory = await this.prisma.factory.findFirst({
        where: { id: configuredFactoryId, tenantId: configuredTenantId, deletedAt: null },
        select: { id: true, tenantId: true },
      });

      if (!factory) {
        throw new ServiceUnavailableException(
          'Factory TV sozlamasi noto‘g‘ri: FACTORY_TV_TENANT_ID/FACTORY_TV_FACTORY_ID mos faol fabrikaga to‘g‘ri kelmadi.',
        );
      }

      return { tenantId: factory.tenantId, factoryId: factory.id };
    }

    return this.autoDetectSingleFactory();
  }

  private async autoDetectSingleFactory(): Promise<FactoryTvContext> {
    const factories = await this.prisma.factory.findMany({
      where: { deletedAt: null, tenant: { deletedAt: null } },
      select: { id: true, tenantId: true },
      take: 2,
    });

    if (factories.length !== 1) {
      throw new ServiceUnavailableException(
        factories.length === 0
          ? 'Factory TV uchun faol fabrika topilmadi. Avval seed skriptini ishga tushiring.'
          : 'Bir nechta tenant mavjud bo‘lganda Factory TV fabrikani avtomatik aniqlay olmaydi. FACTORY_TV_TENANT_ID va FACTORY_TV_FACTORY_ID sozlamalarini kiriting.',
      );
    }

    return { tenantId: factories[0].tenantId, factoryId: factories[0].id };
  }
}
