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
        description: 'Yarn, elastic, labels va packaging master data',
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
        description: 'Stage Inventory oqimi uchun bosqichlar',
        countLabel: `${productionStages.length} ta`,
        records: productionStages,
        href: '/settings/stages',
      }),
      this.categoryCard({
        id: 'salary-rates',
        name: 'Ishbay stavkalar',
        description: 'Bosqich va product variant bo‘yicha dona stavkalari',
        countLabel: `${salaryRates.length} ta`,
        records: salaryRates,
        href: '/settings/salary-rates',
      }),
      this.categoryCard({
        id: 'expense-categories',
        name: 'Xarajat kategoriyalari',
        description: 'Operational expense kategoriyalari',
        countLabel: `${expenseCategories.length} ta`,
        records: expenseCategories,
        href: '/settings/expense-categories',
      }),
      this.categoryCard({
        id: 'warehouse-zones',
        name: 'Ombor zonalari',
        description: 'Main Warehouse va zonalar konfiguratsiyasi',
        countLabel: `${warehouseZones.length} ta`,
        records: warehouseZones,
        href: '/settings/zones',
      }),
      this.categoryCard({
        id: 'roles',
        name: 'Rollar',
        description: 'Tenant-scoped user rollari',
        countLabel: `${roles.length} ta`,
        records: roles,
        href: '/settings/roles',
      }),
      this.categoryCard({
        id: 'permissions',
        name: 'Ruxsatlar',
        description: 'Platform-defined permission katalogi',
        countLabel: `${permissions.length} ta`,
        records: permissions,
        href: '/settings/roles',
      }),
    ];

    const configurationHealth: SettingsConfigurationHealthResponse[] = [
      {
        id: 'product-catalog',
        label: 'Product catalog',
        description: `${products.length} ta product, ${productVariants.length} ta variant, ${colors.length} rang, ${materials.length} material, ${seasons.length} mavsum.`,
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
        label: 'Production stages',
        description: `${productionStages.length} ta faol ishlab chiqarish bosqichi, ${salaryRates.length} ta ishbay stavka.`,
        status: this.configured(productionStages.length > 0 && salaryRates.length > 0),
      },
      {
        id: 'warehouse-zones',
        label: 'Warehouse zones',
        description: `${warehouseZones.length} ta faol ombor zonasi.`,
        status: this.configured(warehouseZones.length > 0),
      },
      {
        id: 'permissions',
        label: 'Permissions',
        description: `${roles.length} ta rol, ${permissions.length} ta platform ruxsati.`,
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
    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    const productVariantId = dto.productVariantId ?? null;

    if (effectiveTo && effectiveTo <= effectiveFrom) {
      throw new BadRequestException('effectiveTo must be after effectiveFrom.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const [stage, productVariant] = await Promise.all([
        tx.productionStage.findFirst({
          where: {
            id: dto.stageId,
            tenantId,
            factoryId,
            deletedAt: null,
          },
          select: { id: true },
        }),
        productVariantId
          ? tx.productVariant.findFirst({
              where: {
                id: productVariantId,
                tenantId,
                deletedAt: null,
                product: { deletedAt: null },
              },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);

      if (!stage) {
        throw new NotFoundException('Production stage not found.');
      }

      if (productVariantId && !productVariant) {
        throw new NotFoundException('Product variant not found.');
      }

      const overlappingRate = await tx.salaryRate.findFirst({
        where: {
          tenantId,
          factoryId,
          productionStageId: stage.id,
          productVariantId,
          deletedAt: null,
          effectiveFrom: effectiveTo ? { lt: effectiveTo } : undefined,
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }],
        },
        select: { id: true },
      });

      if (overlappingRate) {
        throw new ConflictException(
          'Salary rate overlaps with an existing active rate for this scope.',
        );
      }

      const salaryRate = await tx.salaryRate.create({
        data: {
          tenantId,
          factoryId,
          productionStageId: stage.id,
          productVariantId,
          amount,
          effectiveFrom,
          effectiveTo,
        },
        select: salaryRateSelect,
      });
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
