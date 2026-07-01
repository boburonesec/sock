import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEMO_TENANT_ID = 'seed-demo-paypoq-factory';
const DEMO_FACTORY_NAME = 'Main Factory';

export interface DevelopmentTenantContext {
  tenantId: string;
}

export interface DevelopmentFactoryContext extends DevelopmentTenantContext {
  factoryId: string;
}

/**
 * TEMPORARY DEV ONLY.
 *
 * Resolves the deterministic baseline seed context until authenticated tenant
 * and factory context are available. Do not use this as an authorization
 * mechanism in production.
 */
@Injectable()
export class DevContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantContext(): Promise<DevelopmentTenantContext> {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: DEMO_TENANT_ID,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!tenant) {
      throw new ServiceUnavailableException(
        'Temporary development tenant context is missing. Run the development seed first.',
      );
    }

    return { tenantId: tenant.id };
  }

  async getFactoryContext(): Promise<DevelopmentFactoryContext> {
    const { tenantId } = await this.getTenantContext();
    const factory = await this.prisma.factory.findFirst({
      where: {
        tenantId,
        name: DEMO_FACTORY_NAME,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!factory) {
      throw new ServiceUnavailableException(
        'Temporary development factory context is missing. Run the development seed first.',
      );
    }

    return {
      tenantId,
      factoryId: factory.id,
    };
  }
}
