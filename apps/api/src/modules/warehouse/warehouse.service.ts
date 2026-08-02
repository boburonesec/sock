import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StockMovementItemType,
  StockMovementType,
} from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import {
  CreateFinishedProductReceiptDto,
  CreateMaterialReceiptDto,
  CreateStockCorrectionDto,
  UpsertLowStockThresholdDto,
} from './warehouse.dto';
import {
  CollectionResponse,
  FinishedProductReceiptResponse,
  LowStockThresholdResponse,
  MaterialReceiptResponse,
  MaterialStockResponse,
  ProductStockResponse,
  ProductVariantReferenceResponse,
  StockCorrectionResponse,
  StockMovementResponse,
  WarehouseStockSummaryResponse,
  WarehouseZoneResponse,
} from './warehouse.types';

import {
  FINISHED_PRODUCTS_ZONE_NAMES,
  RAW_MATERIALS_ZONE_NAMES,
} from '../../common/factory-defaults';

const RECENT_MOVEMENT_LIMIT = 50;
const PRODUCTION_WAREHOUSE_STAGE_NAME = 'Ombor';

@Injectable()
export class WarehouseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createFinishedProductReceipt(
    context: RequestContext,
    dto: CreateFinishedProductReceiptDto,
  ): Promise<FinishedProductReceiptResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const now = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const [productVariant, omborStage, targetZone] = await Promise.all([
        tx.productVariant.findFirst({
          where: {
            id: dto.productVariantId,
            tenantId,
            deletedAt: null,
            product: { deletedAt: null },
          },
          select: productVariantSelect,
        }),
        tx.productionStage.findFirst({
          where: {
            tenantId,
            factoryId,
            name: PRODUCTION_WAREHOUSE_STAGE_NAME,
            deletedAt: null,
          },
          select: { id: true, name: true, sortOrder: true },
        }),
        this.findTargetFinishedProductZone(tx, {
          tenantId,
          factoryId,
          warehouseZoneId: dto.warehouseZoneId,
        }),
      ]);

      if (!productVariant) {
        throw new NotFoundException('Product variant not found.');
      }

      if (!omborStage) {
        throw new ConflictException(
          'Active Ombor production stage is required before receiving finished products.',
        );
      }

      if (!targetZone) {
        throw new ConflictException(
          'Finished Products warehouse zone is required before receiving finished products.',
        );
      }

      const stageInventoryBefore = await tx.stageInventory.findUnique({
        where: {
          tenantId_factoryId_productionStageId_productVariantId: {
            tenantId,
            factoryId,
            productionStageId: omborStage.id,
            productVariantId: productVariant.id,
          },
        },
        select: stageInventorySelect,
      });

      if (!stageInventoryBefore || stageInventoryBefore.quantity < dto.quantity) {
        throw new ConflictException('Ombor stage does not have enough quantity.');
      }

      const stockBefore = await tx.stock.findUnique({
        where: {
          tenantId_warehouseId_warehouseZoneId_productVariantId: {
            tenantId,
            warehouseId: targetZone.warehouse.id,
            warehouseZoneId: targetZone.id,
            productVariantId: productVariant.id,
          },
        },
        select: stockSelect,
      });

      const stageUpdate = await tx.stageInventory.updateMany({
        where: {
          id: stageInventoryBefore.id,
          tenantId,
          factoryId,
          quantity: { gte: dto.quantity },
        },
        data: {
          quantity: { decrement: dto.quantity },
        },
      });

      if (stageUpdate.count !== 1) {
        throw new ConflictException('Ombor stage does not have enough quantity.');
      }

      const stageInventoryAfter = await tx.stageInventory.findUniqueOrThrow({
        where: { id: stageInventoryBefore.id },
        select: stageInventorySelect,
      });

      const stockAfter = await tx.stock.upsert({
        where: {
          tenantId_warehouseId_warehouseZoneId_productVariantId: {
            tenantId,
            warehouseId: targetZone.warehouse.id,
            warehouseZoneId: targetZone.id,
            productVariantId: productVariant.id,
          },
        },
        create: {
          tenantId,
          factoryId,
          warehouseId: targetZone.warehouse.id,
          warehouseZoneId: targetZone.id,
          productVariantId: productVariant.id,
          quantity: dto.quantity,
        },
        update: {
          quantity: { increment: dto.quantity },
        },
        select: stockSelect,
      });

      const stockMovement = await tx.stockMovement.create({
        data: {
          tenantId,
          factoryId,
          warehouseId: targetZone.warehouse.id,
          warehouseZoneId: targetZone.id,
          itemType: StockMovementItemType.PRODUCT,
          movementType: StockMovementType.PRODUCTION_RECEIPT,
          productVariantId: productVariant.id,
          quantity: new Prisma.Decimal(dto.quantity),
          unit: 'dona',
          beforeQuantity: new Prisma.Decimal(stockBefore?.quantity ?? 0),
          afterQuantity: new Prisma.Decimal(stockAfter.quantity),
          reason: 'FINISHED_PRODUCT_RECEIPT',
          note: dto.note ?? null,
          recordedByUserId: context.userId,
          occurredAt: now,
        },
        select: stockMovementSelect,
      });

      const stageInventoryResponse =
        mapStageInventoryForReceiptResponse(stageInventoryAfter);
      const stockResponse = mapStockResponse(stockAfter);
      const stockMovementResponse = mapStockMovementResponse(stockMovement);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'FINISHED_PRODUCT_RECEIVED',
        entityType: 'Stock',
        entityId: stockAfter.id,
        after: {
          quantity: dto.quantity,
          productVariant,
          warehouse: targetZone.warehouse,
          zone: { id: targetZone.id, name: targetZone.name },
        },
        metadata: dto.note ? { note: dto.note } : undefined,
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'STAGE_INVENTORY_DECREASED',
        entityType: 'StageInventory',
        entityId: stageInventoryAfter.id,
        before: mapStageInventoryForReceiptResponse(stageInventoryBefore),
        after: stageInventoryResponse,
        metadata: {
          stockMovementId: stockMovement.id,
          quantity: dto.quantity,
          reason: 'FINISHED_PRODUCT_RECEIPT',
        },
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'STOCK_INCREASED',
        entityType: 'Stock',
        entityId: stockAfter.id,
        before: stockBefore ? mapStockResponse(stockBefore) : null,
        after: stockResponse,
        metadata: {
          stockMovementId: stockMovement.id,
          quantity: dto.quantity,
          reason: 'FINISHED_PRODUCT_RECEIPT',
        },
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'STOCK_MOVEMENT_CREATED',
        entityType: 'StockMovement',
        entityId: stockMovement.id,
        after: stockMovementResponse,
      });

      return {
        productionStageInventory: stageInventoryResponse,
        stock: stockResponse,
        stockMovement: stockMovementResponse,
      };
    });

    return { data: created };
  }

  async createMaterialReceipt(
    context: RequestContext,
    dto: CreateMaterialReceiptDto,
  ): Promise<MaterialReceiptResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const now = new Date();
    const quantity = this.parsePositiveDecimal(dto.quantity);
    const unit = dto.unit.trim();

    const created = await this.prisma.$transaction(async (tx) => {
      const [material, targetZone] = await Promise.all([
        tx.material.findFirst({
          where: { id: dto.materialId, tenantId, deletedAt: null },
          select: { id: true, name: true },
        }),
        this.findTargetMaterialZone(tx, {
          tenantId,
          factoryId,
          warehouseZoneId: dto.warehouseZoneId,
        }),
      ]);

      if (!material) {
        throw new NotFoundException('Material not found.');
      }

      if (!targetZone) {
        throw new ConflictException(
          'Raw Materials warehouse zone is required before receiving materials.',
        );
      }

      const materialStockUniqueInput = {
        tenantId,
        warehouseId: targetZone.warehouse.id,
        warehouseZoneId: targetZone.id,
        materialId: material.id,
      };

      const materialStockBefore = await tx.materialStock.findUnique({
        where: {
          tenantId_warehouseId_warehouseZoneId_materialId:
            materialStockUniqueInput,
        },
        select: materialStockSelect,
      });

      if (materialStockBefore && materialStockBefore.unit !== unit) {
        throw new ConflictException(
          'Existing material stock uses a different unit for this zone.',
        );
      }

      const materialStockAfter = await tx.materialStock.upsert({
        where: {
          tenantId_warehouseId_warehouseZoneId_materialId:
            materialStockUniqueInput,
        },
        create: {
          tenantId,
          factoryId,
          warehouseId: targetZone.warehouse.id,
          warehouseZoneId: targetZone.id,
          materialId: material.id,
          quantity,
          unit,
        },
        update: {
          quantity: { increment: quantity },
        },
        select: materialStockSelect,
      });

      const stockMovement = await tx.stockMovement.create({
        data: {
          tenantId,
          factoryId,
          warehouseId: targetZone.warehouse.id,
          warehouseZoneId: targetZone.id,
          itemType: StockMovementItemType.MATERIAL,
          movementType: StockMovementType.RECEIPT,
          materialId: material.id,
          quantity,
          unit,
          beforeQuantity:
            materialStockBefore?.quantity ?? new Prisma.Decimal(0),
          afterQuantity: materialStockAfter.quantity,
          reason: 'MATERIAL_RECEIPT',
          note: dto.note ?? null,
          recordedByUserId: context.userId,
          occurredAt: now,
        },
        select: stockMovementSelect,
      });

      const materialStockResponse = mapMaterialStockResponse(materialStockAfter);
      const stockMovementResponse = mapStockMovementResponse(stockMovement);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'MATERIAL_RECEIVED',
        entityType: 'MaterialStock',
        entityId: materialStockAfter.id,
        after: {
          quantity: quantity.toString(),
          unit,
          material,
          warehouse: targetZone.warehouse,
          zone: { id: targetZone.id, name: targetZone.name },
        },
        metadata: dto.note ? { note: dto.note } : undefined,
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'MATERIAL_STOCK_INCREASED',
        entityType: 'MaterialStock',
        entityId: materialStockAfter.id,
        before: materialStockBefore
          ? mapMaterialStockResponse(materialStockBefore)
          : null,
        after: materialStockResponse,
        metadata: {
          stockMovementId: stockMovement.id,
          quantity: quantity.toString(),
          unit,
          reason: 'MATERIAL_RECEIPT',
        },
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'STOCK_MOVEMENT_CREATED',
        entityType: 'StockMovement',
        entityId: stockMovement.id,
        after: stockMovementResponse,
      });

      return {
        materialStock: materialStockResponse,
        stockMovement: stockMovementResponse,
      };
    });

    return { data: created };
  }

  async createStockCorrection(
    context: RequestContext,
    dto: CreateStockCorrectionDto,
  ): Promise<StockCorrectionResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const now = new Date();
    const reason = dto.reason.trim();

    if (!reason) {
      throw new BadRequestException('Reason is required.');
    }

    if (Boolean(dto.productVariantId) === Boolean(dto.materialId)) {
      throw new BadRequestException(
        'Exactly one of productVariantId or materialId must be provided.',
      );
    }

    if (
      (dto.itemType === 'PRODUCT' && !dto.productVariantId) ||
      (dto.itemType === 'MATERIAL' && !dto.materialId)
    ) {
      throw new BadRequestException(
        'Selected itemType must match the provided item id.',
      );
    }

    if (dto.itemType === 'PRODUCT') {
      const newQuantity = this.parseNonNegativeProductQuantity(
        dto.newQuantity,
      );

      const corrected = await this.prisma.$transaction(async (tx) => {
        const [productVariant, targetZone] = await Promise.all([
          tx.productVariant.findFirst({
            where: {
              id: dto.productVariantId,
              tenantId,
              deletedAt: null,
              product: { deletedAt: null },
            },
            select: productVariantSelect,
          }),
          this.findWarehouseZone(tx, {
            tenantId,
            factoryId,
            warehouseZoneId: dto.warehouseZoneId,
          }),
        ]);

        if (!productVariant) {
          throw new NotFoundException('Product variant not found.');
        }

        if (!targetZone) {
          throw new NotFoundException('Warehouse zone not found.');
        }

        const stockUniqueInput = {
          tenantId,
          warehouseId: targetZone.warehouse.id,
          warehouseZoneId: targetZone.id,
          productVariantId: productVariant.id,
        };
        const stockBefore = await tx.stock.findUnique({
          where: {
            tenantId_warehouseId_warehouseZoneId_productVariantId:
              stockUniqueInput,
          },
          select: stockSelect,
        });
        const beforeQuantity = stockBefore?.quantity ?? 0;

        const stockAfter = await tx.stock.upsert({
          where: {
            tenantId_warehouseId_warehouseZoneId_productVariantId:
              stockUniqueInput,
          },
          create: {
            tenantId,
            factoryId,
            warehouseId: targetZone.warehouse.id,
            warehouseZoneId: targetZone.id,
            productVariantId: productVariant.id,
            quantity: newQuantity,
          },
          update: {
            quantity: newQuantity,
          },
          select: stockSelect,
        });
        const delta = Math.abs(newQuantity - beforeQuantity);
        const stockMovement = await tx.stockMovement.create({
          data: {
            tenantId,
            factoryId,
            warehouseId: targetZone.warehouse.id,
            warehouseZoneId: targetZone.id,
            itemType: StockMovementItemType.PRODUCT,
            movementType: StockMovementType.CORRECTION,
            productVariantId: productVariant.id,
            quantity: new Prisma.Decimal(delta),
            unit: 'dona',
            beforeQuantity: new Prisma.Decimal(beforeQuantity),
            afterQuantity: new Prisma.Decimal(stockAfter.quantity),
            reason,
            recordedByUserId: context.userId,
            occurredAt: now,
          },
          select: stockMovementSelect,
        });

        const stockResponse = mapStockResponse(stockAfter);
        const stockMovementResponse = mapStockMovementResponse(stockMovement);

        await this.auditService.createWithTransaction(tx, {
          tenantId,
          factoryId,
          userId: context.userId,
          action: 'STOCK_CORRECTED',
          entityType: 'Stock',
          entityId: stockAfter.id,
          before: stockBefore ? mapStockResponse(stockBefore) : null,
          after: stockResponse,
          metadata: {
            itemType: dto.itemType,
            reason,
            stockMovementId: stockMovement.id,
          },
        });

        await this.auditService.createWithTransaction(tx, {
          tenantId,
          factoryId,
          userId: context.userId,
          action: 'STOCK_MOVEMENT_CREATED',
          entityType: 'StockMovement',
          entityId: stockMovement.id,
          after: stockMovementResponse,
          metadata: {
            reason,
            correctionFor: 'Stock',
          },
        });

        return {
          stock: stockResponse,
          stockMovement: stockMovementResponse,
        };
      });

      return { data: corrected };
    }

    const newQuantity = this.parseNonNegativeDecimal(dto.newQuantity);

    const corrected = await this.prisma.$transaction(async (tx) => {
      const [material, targetZone] = await Promise.all([
        tx.material.findFirst({
          where: { id: dto.materialId, tenantId, deletedAt: null },
          select: { id: true, name: true },
        }),
        this.findWarehouseZone(tx, {
          tenantId,
          factoryId,
          warehouseZoneId: dto.warehouseZoneId,
        }),
      ]);

      if (!material) {
        throw new NotFoundException('Material not found.');
      }

      if (!targetZone) {
        throw new NotFoundException('Warehouse zone not found.');
      }

      const materialStockUniqueInput = {
        tenantId,
        warehouseId: targetZone.warehouse.id,
        warehouseZoneId: targetZone.id,
        materialId: material.id,
      };
      const materialStockBefore = await tx.materialStock.findUnique({
        where: {
          tenantId_warehouseId_warehouseZoneId_materialId:
            materialStockUniqueInput,
        },
        select: materialStockSelect,
      });

      if (!materialStockBefore) {
        throw new ConflictException(
          'Material stock snapshot must exist before correction because unit is stored on the snapshot.',
        );
      }

      const materialStockAfter = await tx.materialStock.update({
        where: {
          tenantId_warehouseId_warehouseZoneId_materialId:
            materialStockUniqueInput,
        },
        data: {
          quantity: newQuantity,
        },
        select: materialStockSelect,
      });
      const delta = newQuantity.minus(materialStockBefore.quantity).abs();
      const stockMovement = await tx.stockMovement.create({
        data: {
          tenantId,
          factoryId,
          warehouseId: targetZone.warehouse.id,
          warehouseZoneId: targetZone.id,
          itemType: StockMovementItemType.MATERIAL,
          movementType: StockMovementType.CORRECTION,
          materialId: material.id,
          quantity: delta,
          unit: materialStockBefore.unit,
          beforeQuantity: materialStockBefore.quantity,
          afterQuantity: materialStockAfter.quantity,
          reason,
          recordedByUserId: context.userId,
          occurredAt: now,
        },
        select: stockMovementSelect,
      });

      const materialStockResponse = mapMaterialStockResponse(materialStockAfter);
      const stockMovementResponse = mapStockMovementResponse(stockMovement);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'STOCK_CORRECTED',
        entityType: 'MaterialStock',
        entityId: materialStockAfter.id,
        before: mapMaterialStockResponse(materialStockBefore),
        after: materialStockResponse,
        metadata: {
          itemType: dto.itemType,
          reason,
          stockMovementId: stockMovement.id,
        },
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'STOCK_MOVEMENT_CREATED',
        entityType: 'StockMovement',
        entityId: stockMovement.id,
        after: stockMovementResponse,
        metadata: {
          reason,
          correctionFor: 'MaterialStock',
        },
      });

      return {
        stock: materialStockResponse,
        stockMovement: stockMovementResponse,
      };
    });

    return { data: corrected };
  }

  async getStock(context: RequestContext): Promise<CollectionResponse<ProductStockResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const stock = await this.prisma.stock.findMany({
      where: { tenantId, factoryId },
      orderBy: { updatedAt: 'desc' },
      select: stockSelect,
    });

    return {
      data: stock.map(mapStockResponse),
    };
  }

  async getMaterialStock(
    context: RequestContext,
  ): Promise<CollectionResponse<MaterialStockResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const materialStock = await this.prisma.materialStock.findMany({
      where: { tenantId, factoryId },
      orderBy: { updatedAt: 'desc' },
      select: materialStockSelect,
    });

    return {
      data: materialStock.map(mapMaterialStockResponse),
    };
  }

  async getMovements(
    context: RequestContext,
  ): Promise<CollectionResponse<StockMovementResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const movements = await this.prisma.stockMovement.findMany({
      where: { tenantId, factoryId },
      orderBy: { occurredAt: 'desc' },
      take: RECENT_MOVEMENT_LIMIT,
      select: stockMovementSelect,
    });

    return {
      data: movements.map(mapStockMovementResponse),
    };
  }

  async getLowStockThresholds(
    context: RequestContext,
  ): Promise<CollectionResponse<LowStockThresholdResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const thresholds = await this.prisma.lowStockThreshold.findMany({
      where: {
        tenantId,
        deletedAt: null,
        warehouse: { tenantId, factoryId, deletedAt: null },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        quantity: true,
        updatedAt: true,
        warehouse: { select: { id: true, name: true } },
        material: { select: { id: true, name: true } },
      },
    });

    return {
      data: thresholds.map((row) => ({
        id: row.id,
        quantity: row.quantity.toString(),
        updatedAt: row.updatedAt,
        warehouse: row.warehouse,
        material: row.material,
      })),
    };
  }

  async upsertLowStockThreshold(
    context: RequestContext,
    dto: UpsertLowStockThresholdDto,
  ): Promise<{ data: LowStockThresholdResponse }> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const quantity = new Prisma.Decimal(dto.quantity);

    if (!quantity.isFinite() || quantity.lt(0)) {
      throw new BadRequestException('Threshold quantity must be zero or positive.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.findFirst({
        where: {
          id: dto.warehouseId,
          tenantId,
          factoryId,
          deletedAt: null,
        },
        select: { id: true, name: true },
      });

      if (!warehouse) {
        throw new NotFoundException('Warehouse not found.');
      }

      const material = await tx.material.findFirst({
        where: { id: dto.materialId, tenantId, deletedAt: null },
        select: { id: true, name: true },
      });

      if (!material) {
        throw new NotFoundException('Material not found.');
      }

      const threshold = await tx.lowStockThreshold.upsert({
        where: {
          tenantId_warehouseId_materialId: {
            tenantId,
            warehouseId: warehouse.id,
            materialId: material.id,
          },
        },
        create: {
          tenantId,
          warehouseId: warehouse.id,
          materialId: material.id,
          quantity,
        },
        update: {
          quantity,
          deletedAt: null,
        },
        select: {
          id: true,
          quantity: true,
          updatedAt: true,
          warehouse: { select: { id: true, name: true } },
          material: { select: { id: true, name: true } },
        },
      });

      const response: LowStockThresholdResponse = {
        id: threshold.id,
        quantity: threshold.quantity.toString(),
        updatedAt: threshold.updatedAt,
        warehouse: threshold.warehouse,
        material: threshold.material,
      };

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'LOW_STOCK_THRESHOLD_UPSERTED',
        entityType: 'LowStockThreshold',
        entityId: threshold.id,
        after: response,
      });

      return response;
    });

    return { data: result };
  }

  async getZones(context: RequestContext): Promise<CollectionResponse<WarehouseZoneResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const zones = await this.prisma.warehouseZone.findMany({
      where: {
        tenantId,
        deletedAt: null,
        warehouse: {
          factoryId,
          deletedAt: null,
        },
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        warehouse: { select: { id: true, name: true } },
        _count: { select: { stocks: true, materialStocks: true } },
      },
    });

    return {
      data: zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        warehouse: zone.warehouse,
        productStockRecordCount: zone._count.stocks,
        materialStockRecordCount: zone._count.materialStocks,
      })),
    };
  }

  /**
   * Backend-owned warehouse summary for operational dashboards. Product and
   * material totals stay on the server so the frontend never derives stock
   * values from individual snapshot rows.
   */
  async getStockSummary(context: RequestContext): Promise<WarehouseStockSummaryResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const [zones, thresholds] = await this.prisma.$transaction([
      this.prisma.warehouseZone.findMany({
        where: {
          tenantId,
          deletedAt: null,
          warehouse: { factoryId, deletedAt: null },
        },
        orderBy: [{ warehouse: { name: 'asc' } }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          warehouse: { select: { id: true, name: true } },
          stocks: { select: { quantity: true } },
          materialStocks: {
            select: {
              materialId: true,
              quantity: true,
              unit: true,
              material: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.lowStockThreshold.findMany({
        where: {
          tenantId,
          deletedAt: null,
          warehouse: { factoryId, deletedAt: null },
        },
        select: {
          warehouseId: true,
          materialId: true,
          quantity: true,
          warehouse: { select: { id: true, name: true } },
          material: { select: { id: true, name: true } },
        },
      }),
    ]);

    const thresholdByWarehouseMaterial = new Map(
      thresholds.map((threshold) => [
        this.warehouseMaterialKey(threshold.warehouseId, threshold.materialId),
        threshold,
      ]),
    );
    const materialTotals = new Map<
      string,
      {
        warehouseId: string;
        warehouseName: string;
        materialId: string;
        materialName: string;
        quantity: Prisma.Decimal;
        unit: string;
      }
    >();

    for (const zone of zones) {
      for (const materialStock of zone.materialStocks) {
        const key = this.warehouseMaterialKey(
          zone.warehouse.id,
          materialStock.materialId,
        );
        const current = materialTotals.get(key);

        if (current) {
          current.quantity = current.quantity.plus(materialStock.quantity);
          continue;
        }

        materialTotals.set(key, {
          warehouseId: zone.warehouse.id,
          warehouseName: zone.warehouse.name,
          materialId: materialStock.material.id,
          materialName: materialStock.material.name,
          quantity: new Prisma.Decimal(materialStock.quantity),
          unit: materialStock.unit,
        });
      }
    }

    const lowStockMaterials = Array.from(materialTotals.entries())
      .flatMap(([key, materialTotal]) => {
        const threshold = thresholdByWarehouseMaterial.get(key);

        if (!threshold || !materialTotal.quantity.lessThan(threshold.quantity)) {
          return [];
        }

        return [
          {
            warehouseId: materialTotal.warehouseId,
            warehouseName: materialTotal.warehouseName,
            materialId: materialTotal.materialId,
            materialName: materialTotal.materialName,
            quantity: materialTotal.quantity.toString(),
            unit: materialTotal.unit,
            threshold: threshold.quantity.toString(),
          },
        ];
      })
      .sort((left, right) => left.materialName.localeCompare(right.materialName));
    const lowStockKeys = new Set(
      lowStockMaterials.map((material) =>
        this.warehouseMaterialKey(material.warehouseId, material.materialId),
      ),
    );
    const finishedProductQuantity = zones
      .filter((zone) =>
        (FINISHED_PRODUCTS_ZONE_NAMES as readonly string[]).includes(zone.name),
      )
      .reduce(
        (total, zone) =>
          total + zone.stocks.reduce((zoneTotal, stock) => zoneTotal + stock.quantity, 0),
        0,
      );
    const materialRecordCount = zones.reduce(
      (total, zone) => total + zone.materialStocks.length,
      0,
    );

    return {
      data: {
        kpis: {
          finishedProductQuantity: String(finishedProductQuantity),
          materialRecordCount: String(materialRecordCount),
          lowStockMaterialCount: String(lowStockMaterials.length),
          warehouseZoneCount: String(zones.length),
        },
        zoneSummaries: zones.map((zone) => {
          const hasLowStockMaterial = zone.materialStocks.some((materialStock) =>
            lowStockKeys.has(
              this.warehouseMaterialKey(
                zone.warehouse.id,
                materialStock.materialId,
              ),
            ),
          );

          return {
            zoneId: zone.id,
            zoneName: zone.name,
            warehouseName: zone.warehouse.name,
            productRecordCount: String(zone.stocks.length),
            materialRecordCount: String(zone.materialStocks.length),
            productQuantity: String(
              zone.stocks.reduce((total, stock) => total + stock.quantity, 0),
            ),
            status: hasLowStockMaterial ? 'ATTENTION' : 'NORMAL',
          };
        }),
        lowStockMaterials,
      },
    };
  }

  private warehouseMaterialKey(warehouseId: string, materialId: string): string {
    return `${warehouseId}:${materialId}`;
  }

  private async findTargetFinishedProductZone(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      factoryId: string;
      warehouseZoneId?: string;
    },
  ) {
    if (input.warehouseZoneId) {
      return tx.warehouseZone.findFirst({
        where: {
          id: input.warehouseZoneId,
          tenantId: input.tenantId,
          deletedAt: null,
          warehouse: {
            factoryId: input.factoryId,
            deletedAt: null,
          },
        },
        select: warehouseZoneForReceiptSelect,
      });
    }

    return tx.warehouseZone.findFirst({
      where: {
        tenantId: input.tenantId,
        name: { in: [...FINISHED_PRODUCTS_ZONE_NAMES] },
        deletedAt: null,
        warehouse: {
          factoryId: input.factoryId,
          deletedAt: null,
        },
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { name: 'asc' }],
      select: warehouseZoneForReceiptSelect,
    });
  }

  private async findTargetMaterialZone(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      factoryId: string;
      warehouseZoneId?: string;
    },
  ) {
    if (input.warehouseZoneId) {
      return tx.warehouseZone.findFirst({
        where: {
          id: input.warehouseZoneId,
          tenantId: input.tenantId,
          deletedAt: null,
          warehouse: {
            factoryId: input.factoryId,
            deletedAt: null,
          },
        },
        select: warehouseZoneForReceiptSelect,
      });
    }

    return tx.warehouseZone.findFirst({
      where: {
        tenantId: input.tenantId,
        name: { in: [...RAW_MATERIALS_ZONE_NAMES] },
        deletedAt: null,
        warehouse: {
          factoryId: input.factoryId,
          deletedAt: null,
        },
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { name: 'asc' }],
      select: warehouseZoneForReceiptSelect,
    });
  }

  private async findWarehouseZone(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      factoryId: string;
      warehouseZoneId: string;
    },
  ) {
    return tx.warehouseZone.findFirst({
      where: {
        id: input.warehouseZoneId,
        tenantId: input.tenantId,
        deletedAt: null,
        warehouse: {
          factoryId: input.factoryId,
          deletedAt: null,
        },
      },
      select: warehouseZoneForReceiptSelect,
    });
  }

  private parsePositiveDecimal(value: string): Prisma.Decimal {
    try {
      const quantity = new Prisma.Decimal(value);

      if (!quantity.isFinite() || quantity.lte(0)) {
        throw new Error('Quantity is not positive.');
      }

      return quantity;
    } catch {
      throw new BadRequestException('Quantity must be a positive decimal.');
    }
  }

  private parseNonNegativeDecimal(value: string): Prisma.Decimal {
    try {
      const quantity = new Prisma.Decimal(value);

      if (!quantity.isFinite() || quantity.lt(0)) {
        throw new Error('Quantity is negative.');
      }

      return quantity;
    } catch {
      throw new BadRequestException('Quantity must be a non-negative decimal.');
    }
  }

  private parseNonNegativeProductQuantity(value: string): number {
    const quantity = this.parseNonNegativeDecimal(value);
    const asNumber = quantity.toNumber();

    if (!Number.isSafeInteger(asNumber)) {
      throw new BadRequestException(
        'Product stock quantity must be a non-negative integer.',
      );
    }

    return asNumber;
  }
}

const productVariantSelect = {
  id: true,
  product: { select: { id: true, name: true } },
  color: { select: { id: true, name: true } },
  material: { select: { id: true, name: true } },
  season: { select: { id: true, name: true } },
} satisfies Prisma.ProductVariantSelect;

const stockSelect = {
  id: true,
  quantity: true,
  updatedAt: true,
  warehouse: { select: { id: true, name: true } },
  warehouseZone: { select: { id: true, name: true } },
  productVariant: { select: productVariantSelect },
} satisfies Prisma.StockSelect;

const materialStockSelect = {
  id: true,
  quantity: true,
  unit: true,
  updatedAt: true,
  warehouse: { select: { id: true, name: true } },
  warehouseZone: { select: { id: true, name: true } },
  material: { select: { id: true, name: true } },
} satisfies Prisma.MaterialStockSelect;

const stockMovementSelect = {
  id: true,
  itemType: true,
  movementType: true,
  quantity: true,
  unit: true,
  beforeQuantity: true,
  afterQuantity: true,
  reason: true,
  note: true,
  occurredAt: true,
  warehouse: { select: { id: true, name: true } },
  warehouseZone: { select: { id: true, name: true } },
  productVariant: { select: productVariantSelect },
  material: { select: { id: true, name: true } },
  recordedBy: { select: { id: true, name: true } },
} satisfies Prisma.StockMovementSelect;

const stageInventorySelect = {
  id: true,
  quantity: true,
  updatedAt: true,
  productionStage: { select: { id: true, name: true, sortOrder: true } },
  productVariant: { select: productVariantSelect },
} satisfies Prisma.StageInventorySelect;

const warehouseZoneForReceiptSelect = {
  id: true,
  name: true,
  warehouse: { select: { id: true, name: true } },
} satisfies Prisma.WarehouseZoneSelect;

function mapStockResponse(stock: {
  id: string;
  quantity: number;
  updatedAt: Date;
  warehouse: { id: string; name: string };
  warehouseZone: { id: string; name: string };
  productVariant: ProductVariantReferenceResponse;
}): ProductStockResponse {
  return {
    id: stock.id,
    quantity: stock.quantity,
    warehouse: stock.warehouse,
    zone: stock.warehouseZone,
    productVariant: stock.productVariant,
    updatedAt: stock.updatedAt,
  };
}

function mapMaterialStockResponse(materialStock: {
  id: string;
  quantity: Prisma.Decimal;
  unit: string;
  updatedAt: Date;
  warehouse: { id: string; name: string };
  warehouseZone: { id: string; name: string };
  material: { id: string; name: string };
}): MaterialStockResponse {
  return {
    id: materialStock.id,
    quantity: materialStock.quantity.toString(),
    unit: materialStock.unit,
    warehouse: materialStock.warehouse,
    zone: materialStock.warehouseZone,
    material: materialStock.material,
    updatedAt: materialStock.updatedAt,
  };
}

function mapStockMovementResponse(movement: {
  id: string;
  itemType: StockMovementItemType;
  movementType: StockMovementType;
  quantity: Prisma.Decimal;
  unit: string;
  beforeQuantity: Prisma.Decimal | null;
  afterQuantity: Prisma.Decimal | null;
  reason: string | null;
  note: string | null;
  occurredAt: Date;
  warehouse: { id: string; name: string };
  warehouseZone: { id: string; name: string };
  productVariant: ProductVariantReferenceResponse | null;
  material: { id: string; name: string } | null;
  recordedBy: { id: string; name: string };
}): StockMovementResponse {
  return {
    id: movement.id,
    itemType: movement.itemType,
    movementType: movement.movementType,
    quantity: movement.quantity.toString(),
    unit: movement.unit,
    beforeQuantity: movement.beforeQuantity?.toString() ?? null,
    afterQuantity: movement.afterQuantity?.toString() ?? null,
    reason: movement.reason,
    note: movement.note,
    occurredAt: movement.occurredAt,
    warehouse: movement.warehouse,
    zone: movement.warehouseZone,
    productVariant: movement.productVariant,
    material: movement.material,
    recordedBy: movement.recordedBy,
  };
}

function mapStageInventoryForReceiptResponse(inventory: {
  id: string;
  quantity: number;
  updatedAt: Date;
  productionStage: { id: string; name: string; sortOrder: number };
  productVariant: ProductVariantReferenceResponse;
}): FinishedProductReceiptResponse['data']['productionStageInventory'] {
  return {
    id: inventory.id,
    quantity: inventory.quantity,
    updatedAt: inventory.updatedAt,
    stage: inventory.productionStage,
    productVariant: inventory.productVariant,
  };
}
