import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import { CreateSalaryRateDto } from './settings.dto';
import {
  CollectionResponse,
  SalaryRateResponse,
  SettingsCategoryCardResponse,
  SettingsConfigurationHealthResponse,
  SettingsOverviewResponse,
  SettingsOverviewStatus,
  SingleResponse,
} from './settings.types';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getOverview(context: RequestContext): Promise<SettingsOverviewResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);

    const [
      colors,
      materials,
      seasons,
      productionStages,
      expenseCategories,
      warehouseZones,
      roles,
      permissions,
      products,
      productVariants,
      salaryRates,
    ] = await Promise.all([
      this.prisma.color.findMany({
        where: { tenantId, deletedAt: null },
        select: { updatedAt: true },
      }),
      this.prisma.material.findMany({
        where: { tenantId, deletedAt: null },
        select: { updatedAt: true },
      }),
      this.prisma.season.findMany({
        where: { tenantId, deletedAt: null },
        select: { updatedAt: true },
      }),
      this.prisma.productionStage.findMany({
        where: { tenantId, factoryId, deletedAt: null },
        select: { updatedAt: true },
      }),
      this.prisma.expenseCategory.findMany({
        where: { tenantId, deletedAt: null },
        select: { updatedAt: true },
      }),
      this.prisma.warehouseZone.findMany({
        where: {
          tenantId,
          deletedAt: null,
          warehouse: { factoryId, deletedAt: null },
        },
        select: { updatedAt: true },
      }),
      this.prisma.role.findMany({
        where: { tenantId, deletedAt: null },
        select: { updatedAt: true },
      }),
      this.prisma.permission.findMany({
        select: { updatedAt: true },
      }),
      this.prisma.product.findMany({
        where: { tenantId, deletedAt: null },
        select: { updatedAt: true },
      }),
      this.prisma.productVariant.findMany({
        where: { tenantId, deletedAt: null },
        select: { updatedAt: true },
      }),
      this.prisma.salaryRate.findMany({
        where: { tenantId, factoryId, deletedAt: null },
        select: { updatedAt: true },
      }),
    ]);

    const categoryCards: SettingsCategoryCardResponse[] = [
      this.categoryCard({
        id: 'colors',
        name: 'Ranglar',
        description: 'Mahsulot ranglar katalogi',
        countLabel: `${colors.length} ta`,
        records: colors,
        href: '/settings/colors',
      }),
      this.categoryCard({
        id: 'materials',
        name: 'Materiallar',
        description: 'Ip, material va qadoqlash master ma’lumotlari',
        countLabel: `${materials.length} ta`,
        records: materials,
        href: '/settings/materials',
      }),
      this.categoryCard({
        id: 'seasons',
        name: 'Mavsumlar',
        description: 'Mahsulot mavsum atributlari',
        countLabel: `${seasons.length} ta`,
        records: seasons,
        href: '/settings/seasons',
      }),
      this.categoryCard({
        id: 'production-stages',
        name: 'Ishlab chiqarish bosqichlari',
        description: 'Bosqich inventari oqimi uchun bosqichlar',
        countLabel: `${productionStages.length} ta`,
        records: productionStages,
        href: '/settings/stages',
      }),
      this.categoryCard({
        id: 'salary-rates',
        name: 'Ishbay stavkalar',
        description: 'Bosqich va mahsulot variant bo‘yicha dona stavkalari',
        countLabel: `${salaryRates.length} ta`,
        records: salaryRates,
        href: '/settings/salary-rates',
      }),
      this.categoryCard({
        id: 'expense-categories',
        name: 'Xarajat kategoriyalari',
        description: 'Operatsion xarajat kategoriyalari',
        countLabel: `${expenseCategories.length} ta`,
        records: expenseCategories,
        href: '/settings/expense-categories',
      }),
      this.categoryCard({
        id: 'warehouse-zones',
        name: 'Ombor zonalari',
        description: 'Asosiy ombor va uning zonalari',
        countLabel: `${warehouseZones.length} ta`,
        records: warehouseZones,
        href: '/settings/zones',
      }),
      this.categoryCard({
        id: 'roles',
        name: 'Rollar',
        description: `Operator rollari va ularga biriktirilgan ruxsatlar (${permissions.length} ta tizim ruxsati)`,
        countLabel: `${roles.length} ta`,
        records: roles,
        href: '/settings/roles',
      }),
      // Alohida "Ruxsatlar" kartasi yo‘q: operator uchun ruxsatlar rol ichida ko‘rinadi.
    ];

    const configurationHealth: SettingsConfigurationHealthResponse[] = [
      {
        id: 'product-catalog',
        label: 'Mahsulot katalogi',
        description: `${products.length} ta mahsulot, ${productVariants.length} ta variant, ${colors.length} rang, ${materials.length} material, ${seasons.length} mavsum.`,
        status: this.configured(
          products.length > 0 &&
            productVariants.length > 0 &&
            colors.length > 0 &&
            materials.length > 0 &&
            seasons.length > 0,
        ),
      },
      {
        id: 'production-stages',
        label: 'Ishlab chiqarish bosqichlari',
        description: `${productionStages.length} ta faol bosqich, ${salaryRates.length} ta ishbay stavka.`,
        status: this.configured(productionStages.length > 0 && salaryRates.length > 0),
      },
      {
        id: 'warehouse-zones',
        label: 'Ombor zonalari',
        description: `${warehouseZones.length} ta faol ombor zonasi.`,
        status: this.configured(warehouseZones.length > 0),
      },
      {
        id: 'roles',
        label: 'Rollar',
        description: `${roles.length} ta rol (ruxsatlar rol ichida biriktirilgan).`,
        status: this.configured(roles.length > 0 && permissions.length > 0),
      },
    ];

    return {
      data: {
        categoryCards,
        configurationHealth,
        // AuditLog-backed settings history needs an approved policy for which
        // actions count as settings changes. Until then, do not fake changes.
        recentChanges: [],
      },
    };
  }

  async getRoles(context: RequestContext) {
    const tenantId = context.tenantId;
    const roles = await this.prisma.role.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            permission: {
              select: { id: true, key: true, name: true },
            },
          },
        },
      },
    });

    return {
      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        permissionCount: String(role.permissions.length),
        permissions: role.permissions.map((row) => ({
          id: row.permission.id,
          key: row.permission.key,
          name: row.permission.name,
        })),
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString(),
      })),
    };
  }

  async getPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      data: permissions.map((permission) => ({
        ...permission,
        createdAt: permission.createdAt.toISOString(),
        updatedAt: permission.updatedAt.toISOString(),
      })),
    };
  }

  async getExpenseCategories(context: RequestContext) {
    const tenantId = context.tenantId;
    const categories = await this.prisma.expenseCategory.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      data: categories.map((category) => ({
        ...category,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      })),
    };
  }

  async getSalaryRates(
    context: RequestContext,
  ): Promise<CollectionResponse<SalaryRateResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const salaryRates = await this.prisma.salaryRate.findMany({
      where: { tenantId, factoryId, deletedAt: null },
      orderBy: [
        { productionStage: { sortOrder: 'asc' } },
        { effectiveFrom: 'desc' },
        { createdAt: 'desc' },
      ],
      select: salaryRateSelect,
    });

    return { data: salaryRates.map(mapSalaryRateResponse) };
  }

  async createSalaryRate(
    context: RequestContext,
    dto: CreateSalaryRateDto,
  ): Promise<SingleResponse<SalaryRateResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const amount = this.parsePositiveAmount(dto.amount);
    const effectiveFrom = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const stage = await tx.productionStage.findFirst({
        where: {
          id: dto.stageId,
          tenantId,
          factoryId,
          deletedAt: null,
        },
        select: { id: true, name: true },
      });

      if (!stage) {
        throw new NotFoundException('Production stage not found.');
      }

      // Bir bosqichda faqat bitta faol (ochiq) stavka.
      const existingActive = await tx.salaryRate.findFirst({
        where: {
          tenantId,
          factoryId,
          productionStageId: stage.id,
          productVariantId: null,
          deletedAt: null,
          effectiveTo: null,
        },
        select: { id: true },
      });

      if (existingActive) {
        throw new ConflictException(
          'Bu bosqich uchun faol stavka allaqachon bor. Avval eskisini arxivlang.',
        );
      }

      let salaryRate;
      try {
        salaryRate = await tx.salaryRate.create({
          data: {
            tenantId,
            factoryId,
            productionStageId: stage.id,
            productVariantId: null,
            amount,
            effectiveFrom,
            effectiveTo: null,
          },
          select: salaryRateSelect,
        });
      } catch (error) {
        // Concurrent create: partial unique index SalaryRate_active_stage_unique.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'Bu bosqich uchun faol stavka allaqachon bor. Avval eskisini arxivlang.',
          );
        }
        throw error;
      }
      const response = mapSalaryRateResponse(salaryRate);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'SALARY_RATE_CREATED',
        entityType: 'SalaryRate',
        entityId: salaryRate.id,
        after: response,
      });

      return response;
    });

    return { data: created };
  }

  async archiveSalaryRate(
    context: RequestContext,
    id: string,
  ): Promise<SingleResponse<SalaryRateResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);

    const archived = await this.prisma.$transaction(async (tx) => {
      const existingRate = await tx.salaryRate.findFirst({
        where: { id, tenantId, factoryId, deletedAt: null },
        select: salaryRateSelect,
      });

      if (!existingRate) {
        throw new NotFoundException('Salary rate not found.');
      }

      const archivedRate = await tx.salaryRate.update({
        where: { id: existingRate.id },
        data: { deletedAt: new Date() },
        select: salaryRateSelect,
      });
      const before = mapSalaryRateResponse(existingRate);
      const after = mapSalaryRateResponse(archivedRate);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'SALARY_RATE_ARCHIVED',
        entityType: 'SalaryRate',
        entityId: archivedRate.id,
        before,
        after,
      });

      return after;
    });

    return { data: archived };
  }

  private categoryCard(input: {
    id: string;
    name: string;
    description: string;
    countLabel: string;
    records: Array<{ updatedAt: Date }>;
    href: string;
  }): SettingsCategoryCardResponse {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      count: input.countLabel,
      updatedAt: this.latestUpdatedAt(input.records),
      status: this.configured(input.records.length > 0),
      href: input.href,
    };
  }

  private latestUpdatedAt(records: Array<{ updatedAt: Date }>): string | null {
    if (records.length === 0) {
      return null;
    }

    return records
      .reduce((latest, record) =>
        record.updatedAt.getTime() > latest.getTime() ? record.updatedAt : latest,
      records[0].updatedAt)
      .toISOString();
  }

  private configured(isConfigured: boolean): SettingsOverviewStatus {
    return isConfigured ? 'CONFIGURED' : 'NEEDS_ATTENTION';
  }

  private parsePositiveAmount(value: string): Prisma.Decimal {
    const amount = new Prisma.Decimal(value);

    if (!amount.isFinite() || amount.lte(0)) {
      throw new BadRequestException('Amount must be positive.');
    }

    return amount;
  }
}

const productVariantSelect = {
  id: true,
  product: { select: { id: true, name: true, code: true } },
  color: { select: { id: true, name: true, code: true } },
  material: { select: { id: true, name: true, code: true } },
  season: { select: { id: true, name: true, code: true } },
} satisfies Prisma.ProductVariantSelect;

const salaryRateSelect = {
  id: true,
  amount: true,
  effectiveFrom: true,
  effectiveTo: true,
  createdAt: true,
  updatedAt: true,
  productionStage: {
    select: {
      id: true,
      name: true,
      sortOrder: true,
    },
  },
  productVariant: { select: productVariantSelect },
} satisfies Prisma.SalaryRateSelect;

function mapSalaryRateResponse(salaryRate: {
  id: string;
  amount: Prisma.Decimal;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
  productionStage: {
    id: string;
    name: string;
    sortOrder: number;
  };
  productVariant: {
    id: string;
    product: { id: string; name: string; code: string | null };
    color: { id: string; name: string; code: string | null };
    material: { id: string; name: string; code: string | null };
    season: { id: string; name: string; code: string | null };
  } | null;
}): SalaryRateResponse {
  return {
    id: salaryRate.id,
    amount: salaryRate.amount.toString(),
    effectiveFrom: salaryRate.effectiveFrom,
    effectiveTo: salaryRate.effectiveTo,
    createdAt: salaryRate.createdAt,
    updatedAt: salaryRate.updatedAt,
    stage: salaryRate.productionStage,
    productVariant: salaryRate.productVariant,
  };
}
