import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import {
  MasterDataItemDto,
  ProductDto,
  ProductPriceDto,
  ProductVariantDto,
  ProductionStageDto,
} from './product.dto';
import {
  CollectionResponse,
  MasterDataItemResponse,
  ProductPriceResponse,
  ProductResponse,
  ProductVariantResponse,
  ProductionStageResponse,
  SingleResponse,
} from './product.types';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getColors(context: RequestContext): Promise<CollectionResponse<MasterDataItemResponse>> {
    const colors = await this.prisma.color.findMany({
      where: { tenantId: context.tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });

    return { data: colors };
  }

  async getMaterials(context: RequestContext): Promise<CollectionResponse<MasterDataItemResponse>> {
    const materials = await this.prisma.material.findMany({
      where: { tenantId: context.tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });

    return { data: materials };
  }

  async getSeasons(context: RequestContext): Promise<CollectionResponse<MasterDataItemResponse>> {
    const seasons = await this.prisma.season.findMany({
      where: { tenantId: context.tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });

    return { data: seasons };
  }

  async getStages(context: RequestContext): Promise<CollectionResponse<ProductionStageResponse>> {
    if (!context.activeFactoryId) {
      throw new ForbiddenException('Active factory is required for production stages.');
    }

    const stages = await this.prisma.productionStage.findMany({
      where: {
        tenantId: context.tenantId,
        factoryId: context.activeFactoryId,
        deletedAt: null,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, sortOrder: true },
    });

    return { data: stages };
  }

  async getProducts(context: RequestContext): Promise<CollectionResponse<ProductResponse>> {
    const products = await this.prisma.product.findMany({
      where: { tenantId: context.tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        variants: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            product: { select: { id: true, name: true, code: true } },
            color: { select: { id: true, name: true, code: true } },
            material: { select: { id: true, name: true, code: true } },
            season: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    return { data: products };
  }

  async createProduct(
    context: RequestContext,
    dto: ProductDto,
  ): Promise<SingleResponse<ProductResponse>> {
    const tenantId = context.tenantId;

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const createdProduct = await tx.product.create({
          data: {
            tenantId,
            name: dto.name,
            code: dto.code ?? null,
          },
          select: productSelect,
        });

        await this.auditService.createWithTransaction(tx, {
          tenantId,
          userId: context.userId,
          action: 'PRODUCT_CREATED',
          entityType: 'Product',
          entityId: createdProduct.id,
          after: createdProduct,
        });

        return createdProduct;
      });

      return { data: product };
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async updateProduct(
    context: RequestContext,
    id: string,
    dto: ProductDto,
  ): Promise<SingleResponse<ProductResponse>> {
    const tenantId = context.tenantId;

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const existingProduct = await tx.product.findFirst({
          where: { id, tenantId, deletedAt: null },
          select: productSelect,
        });

        if (!existingProduct) {
          throw new NotFoundException('Product not found.');
        }

        const updatedProduct = await tx.product.update({
          where: { id: existingProduct.id },
          data: {
            name: dto.name,
            code: dto.code ?? null,
          },
          select: productSelect,
        });

        await this.auditService.createWithTransaction(tx, {
          tenantId,
          userId: context.userId,
          action: 'PRODUCT_UPDATED',
          entityType: 'Product',
          entityId: updatedProduct.id,
          before: existingProduct,
          after: updatedProduct,
        });

        return updatedProduct;
      });

      return { data: product };
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async archiveProduct(
    context: RequestContext,
    id: string,
  ): Promise<SingleResponse<ProductResponse>> {
    const tenantId = context.tenantId;

    const product = await this.prisma.$transaction(async (tx) => {
      const existingProduct = await tx.product.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: productSelect,
      });

      if (!existingProduct) {
        throw new NotFoundException('Product not found.');
      }

      const archivedProduct = await tx.product.update({
        where: { id: existingProduct.id },
        data: { deletedAt: new Date() },
        select: productSelect,
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        userId: context.userId,
        action: 'PRODUCT_ARCHIVED',
        entityType: 'Product',
        entityId: archivedProduct.id,
        before: existingProduct,
        after: archivedProduct,
      });

      return archivedProduct;
    });

    return { data: product };
  }

  async createVariant(
    context: RequestContext,
    productId: string,
    dto: ProductVariantDto,
  ): Promise<SingleResponse<ProductVariantResponse>> {
    const tenantId = context.tenantId;

    try {
      const variant = await this.prisma.$transaction(async (tx) => {
        await this.assertActiveProduct(tx, tenantId, productId);
        await this.assertActiveVariantReferences(tx, tenantId, dto);

        const createdVariant = await tx.productVariant.create({
          data: {
            tenantId,
            productId,
            colorId: dto.colorId,
            materialId: dto.materialId,
            seasonId: dto.seasonId,
          },
          select: productVariantSelect,
        });

        await this.auditService.createWithTransaction(tx, {
          tenantId,
          userId: context.userId,
          action: 'PRODUCT_VARIANT_CREATED',
          entityType: 'ProductVariant',
          entityId: createdVariant.id,
          after: createdVariant,
        });

        return createdVariant;
      });

      return { data: variant };
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async updateVariant(
    context: RequestContext,
    id: string,
    dto: ProductVariantDto,
  ): Promise<SingleResponse<ProductVariantResponse>> {
    const tenantId = context.tenantId;

    try {
      const variant = await this.prisma.$transaction(async (tx) => {
        const existingVariant = await tx.productVariant.findFirst({
          where: {
            id,
            tenantId,
            deletedAt: null,
            product: { deletedAt: null },
          },
          select: productVariantSelect,
        });

        if (!existingVariant) {
          throw new NotFoundException('Product variant not found.');
        }

        await this.assertActiveVariantReferences(tx, tenantId, dto);

        const updatedVariant = await tx.productVariant.update({
          where: { id: existingVariant.id },
          data: {
            colorId: dto.colorId,
            materialId: dto.materialId,
            seasonId: dto.seasonId,
          },
          select: productVariantSelect,
        });

        await this.auditService.createWithTransaction(tx, {
          tenantId,
          userId: context.userId,
          action: 'PRODUCT_VARIANT_UPDATED',
          entityType: 'ProductVariant',
          entityId: updatedVariant.id,
          before: existingVariant,
          after: updatedVariant,
        });

        return updatedVariant;
      });

      return { data: variant };
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async archiveVariant(
    context: RequestContext,
    id: string,
  ): Promise<SingleResponse<ProductVariantResponse>> {
    const tenantId = context.tenantId;

    const variant = await this.prisma.$transaction(async (tx) => {
      const existingVariant = await tx.productVariant.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null,
          product: { deletedAt: null },
        },
        select: productVariantSelect,
      });

      if (!existingVariant) {
        throw new NotFoundException('Product variant not found.');
      }

      const archivedVariant = await tx.productVariant.update({
        where: { id: existingVariant.id },
        data: { deletedAt: new Date() },
        select: productVariantSelect,
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        userId: context.userId,
        action: 'PRODUCT_VARIANT_ARCHIVED',
        entityType: 'ProductVariant',
        entityId: archivedVariant.id,
        before: existingVariant,
        after: archivedVariant,
      });

      return archivedVariant;
    });

    return { data: variant };
  }

  async getVariantPrices(
    context: RequestContext,
    variantId: string,
  ): Promise<CollectionResponse<ProductPriceResponse>> {
    await this.assertReadableActiveVariant(context.tenantId, variantId);

    const prices = await this.prisma.productPrice.findMany({
      where: {
        tenantId: context.tenantId,
        productVariantId: variantId,
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      select: productPriceSelect,
    });

    return { data: prices.map(mapProductPrice) };
  }

  async createVariantPrice(
    context: RequestContext,
    variantId: string,
    dto: ProductPriceDto,
  ): Promise<SingleResponse<ProductPriceResponse>> {
    const tenantId = context.tenantId;
    const amount = new Prisma.Decimal(dto.amount);

    if (amount.lte(0)) {
      throw new ConflictException('Product price amount must be positive.');
    }

    const price = await this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findFirst({
        where: {
          id: variantId,
          tenantId,
          deletedAt: null,
          product: { deletedAt: null },
        },
        select: { id: true, productId: true },
      });

      if (!variant) {
        throw new NotFoundException('Product variant not found.');
      }

      const createdPrice = await tx.productPrice.create({
        data: {
          tenantId,
          productId: variant.productId,
          productVariantId: variant.id,
          amount,
          effectiveFrom: new Date(dto.effectiveFrom),
        },
        select: productPriceSelect,
      });

      const response = mapProductPrice(createdPrice);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        userId: context.userId,
        action: 'PRODUCT_PRICE_CREATED',
        entityType: 'ProductPrice',
        entityId: response.id,
        after: response,
      });

      return response;
    });

    return { data: price };
  }

  async createColor(
    context: RequestContext,
    dto: MasterDataItemDto,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.createCatalogItem(context, 'color', dto, 'COLOR_CREATED');
  }

  async updateColor(
    context: RequestContext,
    id: string,
    dto: MasterDataItemDto,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.updateCatalogItem(context, 'color', id, dto, 'COLOR_UPDATED');
  }

  async archiveColor(
    context: RequestContext,
    id: string,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.archiveCatalogItem(context, 'color', id, 'COLOR_ARCHIVED');
  }

  async createMaterial(
    context: RequestContext,
    dto: MasterDataItemDto,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.createCatalogItem(context, 'material', dto, 'MATERIAL_CREATED');
  }

  async updateMaterial(
    context: RequestContext,
    id: string,
    dto: MasterDataItemDto,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.updateCatalogItem(context, 'material', id, dto, 'MATERIAL_UPDATED');
  }

  async archiveMaterial(
    context: RequestContext,
    id: string,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.archiveCatalogItem(context, 'material', id, 'MATERIAL_ARCHIVED');
  }

  async createSeason(
    context: RequestContext,
    dto: MasterDataItemDto,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.createCatalogItem(context, 'season', dto, 'SEASON_CREATED');
  }

  async updateSeason(
    context: RequestContext,
    id: string,
    dto: MasterDataItemDto,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.updateCatalogItem(context, 'season', id, dto, 'SEASON_UPDATED');
  }

  async archiveSeason(
    context: RequestContext,
    id: string,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.archiveCatalogItem(context, 'season', id, 'SEASON_ARCHIVED');
  }

  async createStage(
    context: RequestContext,
    dto: ProductionStageDto,
  ): Promise<SingleResponse<ProductionStageResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);

    try {
      const stage = await this.prisma.$transaction(async (tx) => {
        const sortOrder = dto.sortOrder ?? (await this.getNextStageSortOrder(tx, tenantId, factoryId));
        const createdStage = await tx.productionStage.create({
          data: {
            tenantId,
            factoryId,
            name: dto.name,
            sortOrder,
          },
          select: productionStageSelect,
        });

        await this.auditService.createWithTransaction(tx, {
          tenantId,
          factoryId,
          userId: context.userId,
          action: 'PRODUCTION_STAGE_CREATED',
          entityType: 'ProductionStage',
          entityId: createdStage.id,
          after: createdStage,
        });

        return createdStage;
      });

      return { data: stage };
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async updateStage(
    context: RequestContext,
    id: string,
    dto: ProductionStageDto,
  ): Promise<SingleResponse<ProductionStageResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);

    try {
      const stage = await this.prisma.$transaction(async (tx) => {
        const existingStage = await tx.productionStage.findFirst({
          where: { id, tenantId, factoryId, deletedAt: null },
          select: productionStageSelect,
        });

        if (!existingStage) {
          throw new NotFoundException('Production stage not found.');
        }

        const updatedStage = await tx.productionStage.update({
          where: { id: existingStage.id },
          data: {
            name: dto.name,
            ...(dto.sortOrder ? { sortOrder: dto.sortOrder } : {}),
          },
          select: productionStageSelect,
        });

        await this.auditService.createWithTransaction(tx, {
          tenantId,
          factoryId,
          userId: context.userId,
          action: 'PRODUCTION_STAGE_UPDATED',
          entityType: 'ProductionStage',
          entityId: updatedStage.id,
          before: existingStage,
          after: updatedStage,
        });

        return updatedStage;
      });

      return { data: stage };
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async archiveStage(
    context: RequestContext,
    id: string,
  ): Promise<SingleResponse<ProductionStageResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);

    const stage = await this.prisma.$transaction(async (tx) => {
      const existingStage = await tx.productionStage.findFirst({
        where: { id, tenantId, factoryId, deletedAt: null },
        select: productionStageSelect,
      });

      if (!existingStage) {
        throw new NotFoundException('Production stage not found.');
      }

      const archivedStage = await tx.productionStage.update({
        where: { id: existingStage.id },
        data: { deletedAt: new Date() },
        select: productionStageSelect,
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'PRODUCTION_STAGE_ARCHIVED',
        entityType: 'ProductionStage',
        entityId: archivedStage.id,
        before: existingStage,
        after: archivedStage,
      });

      return archivedStage;
    });

    return { data: stage };
  }

  private async createCatalogItem(
    context: RequestContext,
    model: CatalogModel,
    dto: MasterDataItemDto,
    action: CatalogAuditAction,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    const tenantId = context.tenantId;

    try {
      const item = await this.prisma.$transaction(async (tx) => {
        const txDelegate = this.getCatalogDelegate(model, tx);
        const createdItem = await txDelegate.create({
          data: {
            tenantId,
            name: dto.name,
            code: dto.code ?? null,
          },
          select: masterDataItemSelect,
        });

        await this.auditService.createWithTransaction(tx, {
          tenantId,
          factoryId: null,
          userId: context.userId,
          action,
          entityType: this.getCatalogEntityType(model),
          entityId: createdItem.id,
          after: createdItem,
        });

        return createdItem;
      });

      return { data: item };
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  private async updateCatalogItem(
    context: RequestContext,
    model: CatalogModel,
    id: string,
    dto: MasterDataItemDto,
    action: CatalogAuditAction,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    const tenantId = context.tenantId;

    try {
      const item = await this.prisma.$transaction(async (tx) => {
        const txDelegate = this.getCatalogDelegate(model, tx);
        const existingItem = await txDelegate.findFirst({
          where: { id, tenantId, deletedAt: null },
          select: masterDataItemSelect,
        });

        if (!existingItem) {
          throw new NotFoundException(`${this.getCatalogEntityType(model)} not found.`);
        }

        const updatedItem = await txDelegate.update({
          where: { id: existingItem.id },
          data: {
            name: dto.name,
            code: dto.code ?? null,
          },
          select: masterDataItemSelect,
        });

        await this.auditService.createWithTransaction(tx, {
          tenantId,
          factoryId: null,
          userId: context.userId,
          action,
          entityType: this.getCatalogEntityType(model),
          entityId: updatedItem.id,
          before: existingItem,
          after: updatedItem,
        });

        return updatedItem;
      });

      return { data: item };
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  private async archiveCatalogItem(
    context: RequestContext,
    model: CatalogModel,
    id: string,
    action: CatalogAuditAction,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    const tenantId = context.tenantId;

    const item = await this.prisma.$transaction(async (tx) => {
      const txDelegate = this.getCatalogDelegate(model, tx);
      const existingItem = await txDelegate.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: masterDataItemSelect,
      });

      if (!existingItem) {
        throw new NotFoundException(`${this.getCatalogEntityType(model)} not found.`);
      }

      const archivedItem = await txDelegate.update({
        where: { id: existingItem.id },
        data: { deletedAt: new Date() },
        select: masterDataItemSelect,
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId: null,
        userId: context.userId,
        action,
        entityType: this.getCatalogEntityType(model),
        entityId: archivedItem.id,
        before: existingItem,
        after: archivedItem,
      });

      return archivedItem;
    });

    return { data: item };
  }

  private getCatalogDelegate(
    model: CatalogModel,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): CatalogDelegate {
    if (model === 'color') {
      return tx.color as unknown as CatalogDelegate;
    }

    if (model === 'material') {
      return tx.material as unknown as CatalogDelegate;
    }

    return tx.season as unknown as CatalogDelegate;
  }

  private getCatalogEntityType(model: CatalogModel): CatalogEntityType {
    if (model === 'color') {
      return 'Color';
    }

    if (model === 'material') {
      return 'Material';
    }

    return 'Season';
  }

  private async getNextStageSortOrder(
    tx: Prisma.TransactionClient,
    tenantId: string,
    factoryId: string,
  ): Promise<number> {
    const result = await tx.productionStage.aggregate({
      where: { tenantId, factoryId },
      _max: { sortOrder: true },
    });

    return (result._max.sortOrder ?? 0) + 1;
  }

  private handleUniqueConstraint(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Active master-data name, code, or sort order already exists.');
    }
  }

  private async assertActiveProduct(
    tx: Prisma.TransactionClient,
    tenantId: string,
    productId: string,
  ): Promise<void> {
    const product = await tx.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }
  }

  private async assertActiveVariantReferences(
    tx: Prisma.TransactionClient,
    tenantId: string,
    dto: ProductVariantDto,
  ): Promise<void> {
    const [color, material, season] = await Promise.all([
      tx.color.findFirst({
        where: { id: dto.colorId, tenantId, deletedAt: null },
        select: { id: true },
      }),
      tx.material.findFirst({
        where: { id: dto.materialId, tenantId, deletedAt: null },
        select: { id: true },
      }),
      tx.season.findFirst({
        where: { id: dto.seasonId, tenantId, deletedAt: null },
        select: { id: true },
      }),
    ]);

    if (!color || !material || !season) {
      throw new NotFoundException('Product variant reference not found.');
    }
  }

  private async assertReadableActiveVariant(
    tenantId: string,
    variantId: string,
  ): Promise<void> {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        tenantId,
        deletedAt: null,
        product: { deletedAt: null },
      },
      select: { id: true },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found.');
    }
  }
}

const masterDataItemSelect = {
  id: true,
  name: true,
  code: true,
} satisfies Prisma.ColorSelect;

const productionStageSelect = {
  id: true,
  name: true,
  sortOrder: true,
} satisfies Prisma.ProductionStageSelect;

const productVariantSelect = {
  id: true,
  product: { select: { id: true, name: true, code: true } },
  color: { select: { id: true, name: true, code: true } },
  material: { select: { id: true, name: true, code: true } },
  season: { select: { id: true, name: true, code: true } },
} satisfies Prisma.ProductVariantSelect;

const productSelect = {
  id: true,
  name: true,
  code: true,
  variants: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: productVariantSelect,
  },
} satisfies Prisma.ProductSelect;

const productPriceSelect = {
  id: true,
  productId: true,
  productVariantId: true,
  amount: true,
  effectiveFrom: true,
  effectiveTo: true,
  createdAt: true,
} satisfies Prisma.ProductPriceSelect;

function mapProductPrice(price: {
  id: string;
  productId: string;
  productVariantId: string | null;
  amount: Prisma.Decimal;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
}): ProductPriceResponse {
  return {
    ...price,
    amount: price.amount.toString(),
  };
}

type CatalogModel = 'color' | 'material' | 'season';
type CatalogEntityType = 'Color' | 'Material' | 'Season';
type CatalogAuditAction =
  | 'COLOR_CREATED'
  | 'COLOR_UPDATED'
  | 'COLOR_ARCHIVED'
  | 'MATERIAL_CREATED'
  | 'MATERIAL_UPDATED'
  | 'MATERIAL_ARCHIVED'
  | 'SEASON_CREATED'
  | 'SEASON_UPDATED'
  | 'SEASON_ARCHIVED';
type CatalogDelegate =
  {
    create(args: Record<string, unknown>): Promise<MasterDataItemResponse>;
    findFirst(args: Record<string, unknown>): Promise<MasterDataItemResponse | null>;
    update(args: Record<string, unknown>): Promise<MasterDataItemResponse>;
  };
