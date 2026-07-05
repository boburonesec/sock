import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import {
  CreateOrganizationFactoryDto,
  CreateOrganizationManagerDto,
  UpdateOrganizationUserFactoryAccessDto,
  UpdateOrganizationUserPasswordDto,
} from './organization.dto';

const DEFAULT_WAREHOUSE_NAME = 'Main Warehouse';
const DEFAULT_WAREHOUSE_ZONES = [
  'Finished Products',
  'Raw Materials',
  'Packaging',
  'Labels',
  'Defects',
] as const;

const DEFAULT_PRODUCTION_STAGES = [
  'Averlog',
  'Dazmol',
  'Sifat',
  'Kiydirish',
  'Par Dazmol',
  'Parlash',
  'Bezak',
  'Etiketka',
  'Qadoqlash',
  'Ombor',
] as const;

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getFactories(context: RequestContext) {
    this.assertOrganizationReader(context);

    const factories = await this.prisma.factory.findMany({
      where: {
        tenantId: context.tenantId,
        deletedAt: null,
        ...(this.isOwner(context)
          ? {}
          : { id: { in: context.accessibleFactoryIds } }),
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            usersWithAccess: true,
          },
        },
      },
    });

    return {
      data: factories.map((factory) => ({
        id: factory.id,
        name: factory.name,
        userCount: factory._count.usersWithAccess,
        createdAt: factory.createdAt,
        updatedAt: factory.updatedAt,
      })),
    };
  }

  async createFactory(context: RequestContext, dto: CreateOrganizationFactoryDto) {
    this.assertOwner(context);

    if (context.branchMode !== 'MULTI') {
      throw new ForbiddenException('Qo‘shimcha filial faqat filialli korxonalar uchun ochiq.');
    }

    const name = this.requiredTrim(dto.name, 'Factory name is required.');

    const result = await this.prisma.$transaction(async (tx) => {
      const factory = await this.createFactoryWithDefaults(tx, context, name);

      return factory;
    });

    return {
      data: {
        id: result.factory.id,
        name: result.factory.name,
        warehouse: {
          id: result.warehouse.id,
          name: result.warehouse.name,
        },
        createdAt: result.factory.createdAt,
      },
    };
  }

  async getUsers(context: RequestContext) {
    this.assertOrganizationReader(context);
    const managerFactoryId = this.isOwner(context) ? undefined : this.requireActiveManagerFactory(context);

    const users = await this.prisma.user.findMany({
      where: {
        tenantId: context.tenantId,
        deletedAt: null,
        roles: {
          none: {
            role: {
              name: 'Owner',
            },
          },
        },
        ...(managerFactoryId
          ? {
              factoryAccesses: {
                some: {
                  tenantId: context.tenantId,
                  factoryId: managerFactoryId,
                },
              },
            }
          : {}),
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
          where: {
            tenantId: context.tenantId,
            factory: {
              deletedAt: null,
            },
          },
          include: {
            factory: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return {
      data: users.map((user) => this.mapUser(user)),
    };
  }

  async createManager(context: RequestContext, dto: CreateOrganizationManagerDto) {
    this.assertOwner(context);
    const name = this.requiredTrim(dto.name, 'Manager name is required.');
    const email = this.requiredTrim(dto.email, 'Manager email is required.').toLowerCase();
    const password = this.requiredTrim(dto.password, 'Password is required.');
    const factoryId =
      context.branchMode === 'MULTI'
        ? this.requiredTrim(dto.factoryId, 'Factory is required.')
        : null;

    const result = await this.prisma.$transaction(async (tx) => {
      const factory = factoryId
        ? await this.findFactoryOrThrow(tx, context.tenantId, factoryId)
        : await this.findDefaultFactoryOrThrow(tx, context.tenantId);
      const managerRole = await tx.role.findUnique({
        where: {
          tenantId_name: {
            tenantId: context.tenantId,
            name: 'Manager',
          },
        },
      });

      if (!managerRole || managerRole.deletedAt) {
        throw new ConflictException('Manager role is not configured.');
      }

      const existingUser = await tx.user.findUnique({
        where: {
          tenantId_email: {
            tenantId: context.tenantId,
            email,
          },
        },
      });

      if (existingUser && !existingUser.deletedAt) {
        throw new ConflictException('User with this email already exists.');
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
              tenantId: context.tenantId,
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
            tenantId: context.tenantId,
          },
        },
        create: {
          tenantId: context.tenantId,
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
            tenantId: context.tenantId,
            userId: user.id,
            roleId: managerRole.id,
          },
        },
        create: {
          tenantId: context.tenantId,
          userId: user.id,
          roleId: managerRole.id,
        },
        update: {},
      });

      await tx.userFactoryAccess.upsert({
        where: {
          tenantId_userId_factoryId: {
            tenantId: context.tenantId,
            userId: user.id,
            factoryId: factory.id,
          },
        },
        create: {
          tenantId: context.tenantId,
          userId: user.id,
          factoryId: factory.id,
        },
        update: {},
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId: context.tenantId,
        factoryId: factory.id,
        userId: context.userId,
        action: 'ORGANIZATION_MANAGER_CREATED',
        entityType: 'User',
        entityId: user.id,
        after: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: 'Manager',
          factoryId: factory.id,
        },
      });

      return { user, factory };
    });

    return {
      data: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        status: result.user.status,
        roles: ['Manager'],
        factories: [{ id: result.factory.id, name: result.factory.name }],
        createdAt: result.user.createdAt,
      },
    };
  }

  async updateUserPassword(
    context: RequestContext,
    userId: string,
    dto: UpdateOrganizationUserPasswordDto,
  ) {
    this.assertOrganizationReader(context);
    const password = this.requiredTrim(dto.password, 'Password is required.');

    const user = await this.findUserForManagement(context, userId);
    await this.assertCanManageUser(context, user);
    const passwordHash = await argon2.hash(password);

    await this.prisma.$transaction(async (tx) => {
      await tx.userCredential.upsert({
        where: {
          userId_tenantId: {
            userId,
            tenantId: context.tenantId,
          },
        },
        create: {
          tenantId: context.tenantId,
          userId,
          passwordHash,
        },
        update: {
          passwordHash,
          passwordUpdatedAt: new Date(),
        },
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId: context.tenantId,
        factoryId: context.activeFactoryId,
        userId: context.userId,
        action: 'ORGANIZATION_USER_PASSWORD_RESET',
        entityType: 'User',
        entityId: user.id,
        metadata: {
          targetUserId: user.id,
        },
      });
    });

    return {
      data: {
        status: 'ok',
      },
    };
  }

  async updateUserFactoryAccess(
    context: RequestContext,
    userId: string,
    dto: UpdateOrganizationUserFactoryAccessDto,
  ) {
    this.assertOwner(context);

    if (context.branchMode !== 'MULTI') {
      throw new ForbiddenException('Filial ruxsatlari faqat filialli korxonalar uchun ochiq.');
    }

    const factoryIds = Array.from(new Set(dto.factoryIds.map((id) => id.trim()).filter(Boolean)));

    if (factoryIds.length === 0) {
      throw new BadRequestException('At least one factory is required.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          id_tenantId: {
            id: userId,
            tenantId: context.tenantId,
          },
        },
        include: {
          factoryAccesses: true,
        },
      });

      if (!user || user.deletedAt) {
        throw new NotFoundException('User not found.');
      }

      const factories = await tx.factory.findMany({
        where: {
          tenantId: context.tenantId,
          id: {
            in: factoryIds,
          },
          deletedAt: null,
        },
      });

      if (factories.length !== factoryIds.length) {
        throw new BadRequestException('Factory access contains invalid factory.');
      }

      const previousFactoryIds = user.factoryAccesses.map((access) => access.factoryId);

      await tx.userFactoryAccess.deleteMany({
        where: {
          tenantId: context.tenantId,
          userId,
          factoryId: {
            notIn: factoryIds,
          },
        },
      });

      for (const factoryId of factoryIds) {
        await tx.userFactoryAccess.upsert({
          where: {
            tenantId_userId_factoryId: {
              tenantId: context.tenantId,
              userId,
              factoryId,
            },
          },
          create: {
            tenantId: context.tenantId,
            userId,
            factoryId,
          },
          update: {},
        });
      }

      await this.auditService.createWithTransaction(tx, {
        tenantId: context.tenantId,
        factoryId: context.activeFactoryId,
        userId: context.userId,
        action: 'ORGANIZATION_USER_FACTORY_ACCESS_UPDATED',
        entityType: 'UserFactoryAccess',
        entityId: userId,
        before: {
          factoryIds: previousFactoryIds,
        },
        after: {
          factoryIds,
        },
      });

      return this.getUserById(tx, context.tenantId, userId);
    });

    return {
      data: this.mapUser(result),
    };
  }

  private assertOrganizationReader(context: RequestContext): void {
    if (this.isOwner(context) || this.isManager(context)) {
      return;
    }

    throw new ForbiddenException('Organization settings are not allowed.');
  }

  private assertOwner(context: RequestContext): void {
    if (!this.isOwner(context)) {
      throw new ForbiddenException('Only owner can manage organization settings.');
    }
  }

  private async assertCanManageUser(
    context: RequestContext,
    user: {
      id: string;
      factoryAccesses: Array<{ factoryId: string }>;
    },
  ): Promise<void> {
    if (this.isOwner(context)) {
      return;
    }

    if (this.isManager(context)) {
      const factoryId = this.requireActiveManagerFactory(context);
      const hasAccess = user.factoryAccesses.some((access) => access.factoryId === factoryId);

      if (hasAccess) {
        return;
      }
    }

    throw new ForbiddenException('User is outside your organization access.');
  }

  private async findUserForManagement(context: RequestContext, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id_tenantId: {
          id: userId,
          tenantId: context.tenantId,
        },
      },
      include: {
        factoryAccesses: {
          where: {
            tenantId: context.tenantId,
            factory: {
              deletedAt: null,
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  private requireActiveManagerFactory(context: RequestContext): string {
    if (!context.activeFactoryId || !context.accessibleFactoryIds.includes(context.activeFactoryId)) {
      throw new ForbiddenException('Active factory is required.');
    }

    return context.activeFactoryId;
  }

  private async findFactoryOrThrow(
    tx: Prisma.TransactionClient,
    tenantId: string,
    factoryId: string,
  ) {
    const factory = await tx.factory.findUnique({
      where: {
        id_tenantId: {
          id: factoryId,
          tenantId,
        },
      },
    });

    if (!factory || factory.deletedAt) {
      throw new BadRequestException('Factory does not belong to tenant.');
    }

    return factory;
  }

  private async findDefaultFactoryOrThrow(tx: Prisma.TransactionClient, tenantId: string) {
    const factory = await tx.factory.findFirst({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!factory) {
      throw new ConflictException('Default factory is not configured.');
    }

    return factory;
  }

  private async createFactoryWithDefaults(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    name: string,
  ) {
    const factory = await tx.factory.create({
      data: {
        tenantId: context.tenantId,
        name,
      },
    });

    const warehouse = await tx.warehouse.create({
      data: {
        tenantId: context.tenantId,
        factoryId: factory.id,
        name: DEFAULT_WAREHOUSE_NAME,
      },
    });

    for (const zoneName of DEFAULT_WAREHOUSE_ZONES) {
      await tx.warehouseZone.create({
        data: {
          tenantId: context.tenantId,
          warehouseId: warehouse.id,
          name: zoneName,
        },
      });
    }

    for (const [index, stageName] of DEFAULT_PRODUCTION_STAGES.entries()) {
      await tx.productionStage.create({
        data: {
          tenantId: context.tenantId,
          factoryId: factory.id,
          name: stageName,
          sortOrder: index + 1,
        },
      });
    }

    await this.auditService.createWithTransaction(tx, {
      tenantId: context.tenantId,
      factoryId: factory.id,
      userId: context.userId,
      action: 'ORGANIZATION_FACTORY_CREATED',
      entityType: 'Factory',
      entityId: factory.id,
      after: {
        id: factory.id,
        name: factory.name,
      },
      metadata: {
        defaultWarehouseName: DEFAULT_WAREHOUSE_NAME,
        defaultZones: [...DEFAULT_WAREHOUSE_ZONES],
        defaultProductionStages: [...DEFAULT_PRODUCTION_STAGES],
      },
    });

    return { factory, warehouse };
  }

  private async getUserById(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
  ) {
    const user = await tx.user.findUniqueOrThrow({
      where: {
        id_tenantId: {
          id: userId,
          tenantId,
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        factoryAccesses: {
          where: {
            tenantId,
            factory: {
              deletedAt: null,
            },
          },
          include: {
            factory: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return user;
  }

  private mapUser(user: {
    id: string;
    name: string;
    email: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    roles: Array<{ role: { name: string } }>;
    factoryAccesses: Array<{ factory: { id: string; name: string } }>;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      roles: user.roles.map((userRole) => userRole.role.name),
      factories: user.factoryAccesses.map((access) => ({
        id: access.factory.id,
        name: access.factory.name,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private requiredTrim(value: string | undefined, message: string): string {
    const trimmed = value?.trim();

    if (!trimmed) {
      throw new BadRequestException(message);
    }

    return trimmed;
  }

  private isOwner(context: RequestContext): boolean {
    return context.roles.includes('Owner');
  }

  private isManager(context: RequestContext): boolean {
    return context.roles.includes('Manager');
  }
}
