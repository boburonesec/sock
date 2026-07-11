import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TenantBranchMode, TenantStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformAdminContext } from '../identity/platform-auth/platform-auth.types';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_PRODUCTION_STAGES,
  DEFAULT_WAREHOUSE_NAME,
  DEFAULT_WAREHOUSE_ZONES,
} from '../../common/factory-defaults';
import {
  CreatePlatformFactoryDto,
  CreatePlatformOwnerUserDto,
  CreatePlatformTenantDto,
  UpdatePlatformTenantBranchModeDto,
  UpdatePlatformTenantUserPasswordDto,
} from './platform-admin.dto';

const DEFAULT_FACTORY_NAME = 'Asosiy filial';

const PERMISSION_DEFINITIONS = [
  'dashboard.view',
  'production.view',
  'production.write',
  'warehouse.view',
  'warehouse.write',
  'sales.view',
  'sales.write',
  'finance.view',
  'finance.write',
  'employees.view',
  'employees.write',
  'reports.view',
  'settings.view',
  'settings.write',
  'audit.view',
] as const;

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  Owner: PERMISSION_DEFINITIONS,
  Manager: [
    'dashboard.view',
    'production.view',
    'production.write',
    'warehouse.view',
    'warehouse.write',
    'sales.view',
    'sales.write',
    'finance.view',
    'finance.write',
    'employees.view',
    'employees.write',
    'reports.view',
    'settings.view',
    'settings.write',
  ],
  Accountant: ['finance.view', 'finance.write', 'sales.view', 'reports.view'],
  Seller: ['sales.view', 'sales.write'],
  'Warehouse Operator': ['warehouse.view', 'warehouse.write'],
  'Shift Receiver': ['production.view', 'production.write'],
};

@Injectable()
export class PlatformAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        status: true,
        branchMode: true,
        subscriptionStatus: true,
        planCode: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        factories: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
          },
        },
        users: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
          },
        },
      },
    });

    return {
      data: tenants.map((tenant) => ({
        ...this.mapTenant(tenant),
        factoryCount: String(tenant.factories.length),
        userCount: String(tenant.users.length),
      })),
    };
  }

  async createTenant(dto: CreatePlatformTenantDto, platformAdmin: PlatformAdminContext) {
    const name = this.requiredTrim(dto.name, 'Tenant name is required.');

    const tenant = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          name,
          status: 'PILOT',
          branchMode: dto.branchMode ?? 'SINGLE',
          subscriptionStatus: 'NONE',
          contactName: this.optionalTrim(dto.contactName),
          contactPhone: this.optionalTrim(dto.contactPhone),
          contactEmail: this.optionalTrim(dto.contactEmail)?.toLowerCase(),
          planCode: this.optionalTrim(dto.planCode),
          notes: this.optionalTrim(dto.notes),
          pilotStartedAt: new Date(),
        },
      });

      await tx.platformAuditLog.create({
        data: {
          platformAdminId: platformAdmin.platformAdminId,
          tenantId: created.id,
          action: 'TENANT_CREATED',
          entityType: 'Tenant',
          entityId: created.id,
          after: this.toJson(created),
        },
      });

      await this.ensureDefaultRolesAndPermissions(tx, created.id);
      await this.ensureDefaultExpenseCategories(tx, created.id);
      await this.createFactoryWithDefaults(tx, {
        tenantId: created.id,
        name: DEFAULT_FACTORY_NAME,
        platformAdmin,
      });

      return created;
    });

    return {
      data: this.mapTenant(tenant),
    };
  }

  async getTenant(id: string) {
    const tenant = await this.findTenantOrThrow(id);

    return {
      data: {
        ...this.mapTenant(tenant),
        factories: tenant.factories.map((factory) => ({
          id: factory.id,
          name: factory.name,
          createdAt: factory.createdAt,
        })),
        users: tenant.users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.status,
          createdAt: user.createdAt,
          roles: user.roles.map((userRole) => userRole.role.name),
          factories: user.factoryAccesses.map((access) => access.factory.name),
        })),
      },
    };
  }

  async createFactory(
    tenantId: string,
    dto: CreatePlatformFactoryDto,
    platformAdmin: PlatformAdminContext,
  ) {
    const name = this.requiredTrim(dto.name, 'Factory name is required.');
    const location = this.optionalTrim(dto.location);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: {
          id: tenantId,
        },
      });

      if (!tenant || tenant.deletedAt) {
        throw new NotFoundException('Tenant not found.');
      }

      await this.ensureDefaultRolesAndPermissions(tx, tenantId);

      return this.createFactoryWithDefaults(tx, {
        tenantId,
        name,
        location,
        platformAdmin,
      });
    });

    return {
      data: {
        id: result.factory.id,
        tenantId: result.factory.tenantId,
        name: result.factory.name,
        warehouse: {
          id: result.warehouse.id,
          name: result.warehouse.name,
        },
        createdAt: result.factory.createdAt,
      },
    };
  }

  async updateTenantBranchMode(
    id: string,
    dto: UpdatePlatformTenantBranchModeDto,
    platformAdmin: PlatformAdminContext,
  ) {
    const targetMode = dto.branchMode as TenantBranchMode;

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id },
      });

      if (!tenant || tenant.deletedAt) {
        throw new NotFoundException('Tenant not found.');
      }

      if (tenant.branchMode === targetMode) {
        return tenant;
      }

      if (targetMode === 'SINGLE') {
        const activeFactoryCount = await tx.factory.count({
          where: {
            tenantId: id,
            deletedAt: null,
          },
        });

        if (activeFactoryCount > 1) {
          throw new BadRequestException(
            'Korxonada bir nechta faol filial bor. Avval bitta filial qoldiring.',
          );
        }
      }

      const updated = await tx.tenant.update({
        where: { id },
        data: {
          branchMode: targetMode,
        },
      });

      await tx.platformAuditLog.create({
        data: {
          platformAdminId: platformAdmin.platformAdminId,
          tenantId: id,
          action: 'TENANT_BRANCH_MODE_UPDATED',
          entityType: 'Tenant',
          entityId: id,
          before: this.toJson({ branchMode: tenant.branchMode }),
          after: this.toJson({ branchMode: updated.branchMode }),
        },
      });

      return updated;
    });

    return {
      data: this.mapTenant(result),
    };
  }

  async createOwnerUser(
    tenantId: string,
    dto: CreatePlatformOwnerUserDto,
    platformAdmin: PlatformAdminContext,
  ) {
    const name = this.requiredTrim(dto.name, 'Owner name is required.');
    const email = this.requiredTrim(dto.email, 'Owner email is required.').toLowerCase();
    const password = dto.password?.trim() || this.createTemporaryPassword();

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: {
          id: tenantId,
        },
      });

      if (!tenant || tenant.deletedAt) {
        throw new NotFoundException('Tenant not found.');
      }

      let factory = dto.factoryId
        ? await tx.factory.findUnique({
            where: {
              id_tenantId: {
                id: dto.factoryId,
                tenantId,
              },
            },
          })
        : await tx.factory.findFirst({
            where: {
              tenantId,
              deletedAt: null,
            },
            orderBy: {
              createdAt: 'asc',
            },
          });

      if (!factory || factory.deletedAt) {
        if (dto.factoryId) {
          throw new BadRequestException('Factory does not belong to tenant.');
        }

        const createdDefault = await this.createFactoryWithDefaults(tx, {
          tenantId,
          name: DEFAULT_FACTORY_NAME,
          platformAdmin,
        });
        factory = createdDefault.factory;
      }

      await this.ensureDefaultRolesAndPermissions(tx, tenantId);

      const ownerRole = await tx.role.findUnique({
        where: {
          tenantId_name: {
            tenantId,
            name: 'Owner',
          },
        },
      });

      if (!ownerRole) {
        throw new ConflictException('Owner role was not created.');
      }

      const existingUser = await tx.user.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email,
          },
        },
      });

      if (existingUser && !existingUser.deletedAt) {
        throw new ConflictException('User with this email already exists in tenant.');
      }

      const user = existingUser
        ? await tx.user.update({
            where: {
              id: existingUser.id,
            },
            data: {
              name,
              status: 'ACTIVE',
              deletedAt: null,
            },
          })
        : await tx.user.create({
            data: {
              tenantId,
              name,
              email,
              status: 'ACTIVE',
            },
          });

      const passwordHash = await argon2.hash(password);

      await tx.userCredential.upsert({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId,
          },
        },
        create: {
          tenantId,
          userId: user.id,
          passwordHash,
        },
        update: {
          passwordHash,
          passwordUpdatedAt: new Date(),
        },
      });

      await tx.userRole.upsert({
        where: {
          tenantId_userId_roleId: {
            tenantId,
            userId: user.id,
            roleId: ownerRole.id,
          },
        },
        create: {
          tenantId,
          userId: user.id,
          roleId: ownerRole.id,
        },
        update: {},
      });

      await tx.userFactoryAccess.upsert({
        where: {
          tenantId_userId_factoryId: {
            tenantId,
            userId: user.id,
            factoryId: factory.id,
          },
        },
        create: {
          tenantId,
          userId: user.id,
          factoryId: factory.id,
        },
        update: {},
      });

      await tx.platformAuditLog.createMany({
        data: [
          {
            platformAdminId: platformAdmin.platformAdminId,
            tenantId,
            factoryId: factory.id,
            action: 'TENANT_OWNER_CREATED',
            entityType: 'User',
            entityId: user.id,
            after: this.toJson({
              id: user.id,
              tenantId,
              name: user.name,
              email: user.email,
              status: user.status,
            }),
          },
          {
            platformAdminId: platformAdmin.platformAdminId,
            tenantId,
            factoryId: factory.id,
            action: 'USER_ROLE_ASSIGNED',
            entityType: 'UserRole',
            entityId: user.id,
            metadata: {
              role: 'Owner',
            },
          },
          {
            platformAdminId: platformAdmin.platformAdminId,
            tenantId,
            factoryId: factory.id,
            action: 'USER_FACTORY_ACCESS_ASSIGNED',
            entityType: 'UserFactoryAccess',
            entityId: user.id,
            metadata: {
              factoryId: factory.id,
            },
          },
        ],
      });

      return { user, generatedPassword: dto.password ? null : password };
    });

    return {
      data: {
        id: result.user.id,
        tenantId: result.user.tenantId,
        name: result.user.name,
        email: result.user.email,
        status: result.user.status,
        generatedPassword: result.generatedPassword,
      },
    };
  }

  async activateTenant(id: string, platformAdmin: PlatformAdminContext) {
    return this.updateTenantStatus(id, 'ACTIVE', platformAdmin, 'TENANT_ACTIVATED');
  }

  async suspendTenant(id: string, platformAdmin: PlatformAdminContext) {
    return this.updateTenantStatus(id, 'SUSPENDED', platformAdmin, 'TENANT_SUSPENDED');
  }

  async updateTenantUserPassword(
    tenantId: string,
    userId: string,
    dto: UpdatePlatformTenantUserPasswordDto,
    platformAdmin: PlatformAdminContext,
  ) {
    const password = this.requiredTrim(dto.password, 'Password is required.');

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          id_tenantId: {
            id: userId,
            tenantId,
          },
        },
      });

      if (!user || user.deletedAt) {
        throw new NotFoundException('User not found.');
      }

      const passwordHash = await argon2.hash(password);

      await tx.userCredential.upsert({
        where: {
          userId_tenantId: {
            userId,
            tenantId,
          },
        },
        create: {
          tenantId,
          userId,
          passwordHash,
        },
        update: {
          passwordHash,
          passwordUpdatedAt: new Date(),
        },
      });

      await tx.platformAuditLog.create({
        data: {
          platformAdminId: platformAdmin.platformAdminId,
          tenantId,
          action: 'TENANT_USER_PASSWORD_UPDATED',
          entityType: 'User',
          entityId: user.id,
          after: this.toJson({
            id: user.id,
            email: user.email,
          }),
        },
      });

      return user;
    });

    return {
      data: {
        id: result.id,
        tenantId: result.tenantId,
        name: result.name,
        email: result.email,
        status: result.status,
        createdAt: result.createdAt,
      },
    };
  }

  async getTenantHealth(id: string) {
    const tenant = await this.findTenantOrThrow(id);
    const [
      factoryCount,
      activeUserCount,
      activeEmployeeCount,
      productCount,
      orderCount,
      stockMovementCount,
      payrollPeriodCount,
      lastLoginUser,
      lastStockMovement,
    ] = await Promise.all([
      this.prisma.factory.count({ where: { tenantId: id, deletedAt: null } }),
      this.prisma.user.count({ where: { tenantId: id, deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.employee.count({ where: { tenantId: id, deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.product.count({ where: { tenantId: id, deletedAt: null } }),
      this.prisma.salesOrder.count({ where: { tenantId: id } }),
      this.prisma.stockMovement.count({ where: { tenantId: id } }),
      this.prisma.payrollPeriod.count({ where: { tenantId: id } }),
      this.prisma.user.findFirst({
        where: { tenantId: id, lastLoginAt: { not: null } },
        orderBy: { lastLoginAt: 'desc' },
        select: { lastLoginAt: true },
      }),
      this.prisma.stockMovement.findFirst({
        where: { tenantId: id },
        orderBy: { occurredAt: 'desc' },
        select: { occurredAt: true },
      }),
    ]);

    return {
      data: {
        tenant: this.mapTenant(tenant),
        metrics: {
          factoryCount: String(factoryCount),
          activeUserCount: String(activeUserCount),
          activeEmployeeCount: String(activeEmployeeCount),
          productCount: String(productCount),
          orderCount: String(orderCount),
          stockMovementCount: String(stockMovementCount),
          payrollPeriodCount: String(payrollPeriodCount),
        },
        lastLoginAt: lastLoginUser?.lastLoginAt ?? null,
        lastStockMovementAt: lastStockMovement?.occurredAt ?? null,
        readiness: {
          hasFactory: factoryCount > 0,
          hasActiveUser: activeUserCount > 0,
          hasProductCatalog: productCount > 0,
        },
        notes: [
          'Tenant suspension login enforcement is deferred in this milestone.',
        ],
      },
    };
  }

  private async updateTenantStatus(
    id: string,
    status: TenantStatus,
    platformAdmin: PlatformAdminContext,
    action: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({ where: { id } });

      if (!tenant || tenant.deletedAt) {
        throw new NotFoundException('Tenant not found.');
      }

      const now = new Date();
      const updated = await tx.tenant.update({
        where: { id },
        data: {
          status,
          activatedAt: status === 'ACTIVE' ? now : tenant.activatedAt,
          suspendedAt: status === 'SUSPENDED' ? now : tenant.suspendedAt,
        },
      });

      await tx.platformAuditLog.create({
        data: {
          platformAdminId: platformAdmin.platformAdminId,
          tenantId: id,
          action,
          entityType: 'Tenant',
          entityId: id,
          before: this.toJson({ status: tenant.status }),
          after: this.toJson({ status: updated.status }),
        },
      });

      return updated;
    });

    return {
      data: this.mapTenant(result),
    };
  }

  private async findTenantOrThrow(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        factories: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        users: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            roles: {
              include: {
                role: true,
              },
            },
            factoryAccesses: {
              include: {
                factory: true,
              },
            },
          },
        },
      },
    });

    if (!tenant || tenant.deletedAt) {
      throw new NotFoundException('Tenant not found.');
    }

    return tenant;
  }

  private async ensureDefaultRolesAndPermissions(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<void> {
    const permissionsByKey = new Map<string, string>();

    for (const key of PERMISSION_DEFINITIONS) {
      const permission = await tx.permission.upsert({
        where: { key },
        create: { key, name: key },
        update: { name: key },
      });

      permissionsByKey.set(key, permission.id);
    }

    for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await tx.role.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name: roleName,
          },
        },
        create: {
          tenantId,
          name: roleName,
        },
        update: {
          deletedAt: null,
        },
      });

      for (const permissionKey of permissionKeys) {
        const permissionId = permissionsByKey.get(permissionKey);

        if (!permissionId) {
          throw new ConflictException(`Missing permission ${permissionKey}.`);
        }

        await tx.rolePermission.upsert({
          where: {
            tenantId_roleId_permissionId: {
              tenantId,
              roleId: role.id,
              permissionId,
            },
          },
          create: {
            tenantId,
            roleId: role.id,
            permissionId,
          },
          update: {},
        });
      }
    }
  }

  private async ensureDefaultExpenseCategories(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<void> {
    for (const name of DEFAULT_EXPENSE_CATEGORIES) {
      await tx.expenseCategory.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name,
          },
        },
        create: {
          tenantId,
          name,
        },
        update: {
          deletedAt: null,
        },
      });
    }
  }

  private async createFactoryWithDefaults(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      name: string;
      location?: string;
      platformAdmin: PlatformAdminContext;
    },
  ) {
    const factory = await tx.factory.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
      },
    });

    const warehouse = await tx.warehouse.create({
      data: {
        tenantId: input.tenantId,
        factoryId: factory.id,
        name: DEFAULT_WAREHOUSE_NAME,
      },
    });

    for (const zoneName of DEFAULT_WAREHOUSE_ZONES) {
      await tx.warehouseZone.create({
        data: {
          tenantId: input.tenantId,
          warehouseId: warehouse.id,
          name: zoneName,
        },
      });
    }

    for (const [index, stageName] of DEFAULT_PRODUCTION_STAGES.entries()) {
      await tx.productionStage.create({
        data: {
          tenantId: input.tenantId,
          factoryId: factory.id,
          name: stageName,
          sortOrder: index + 1,
        },
      });
    }

    await tx.platformAuditLog.create({
      data: {
        platformAdminId: input.platformAdmin.platformAdminId,
        tenantId: input.tenantId,
        factoryId: factory.id,
        action: 'FACTORY_CREATED',
        entityType: 'Factory',
        entityId: factory.id,
        after: this.toJson(factory),
        metadata: {
          defaultWarehouseName: DEFAULT_WAREHOUSE_NAME,
          defaultZones: [...DEFAULT_WAREHOUSE_ZONES],
          defaultProductionStages: [...DEFAULT_PRODUCTION_STAGES],
          location: input.location,
        },
      },
    });

    return { factory, warehouse };
  }

  private mapTenant(tenant: {
    id: string;
    name: string;
    status: TenantStatus;
    branchMode: TenantBranchMode;
    subscriptionStatus: string;
    planCode: string | null;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: tenant.id,
      name: tenant.name,
      status: tenant.status,
      branchMode: tenant.branchMode,
      subscriptionStatus: tenant.subscriptionStatus,
      planCode: tenant.planCode,
      contactName: tenant.contactName,
      contactPhone: tenant.contactPhone,
      contactEmail: tenant.contactEmail,
      notes: tenant.notes,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  private requiredTrim(value: string, message: string): string {
    const trimmed = value.trim();

    if (!trimmed) {
      throw new BadRequestException(message);
    }

    return trimmed;
  }

  private optionalTrim(value: string | undefined): string | undefined {
    const trimmed = value?.trim();

    return trimmed || undefined;
  }

  private createTemporaryPassword(): string {
    return randomBytes(18).toString('base64url');
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
