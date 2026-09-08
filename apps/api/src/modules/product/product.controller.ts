import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequireAnyPermissions } from '../identity/authorization/require-any-permissions.decorator';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import {
  MasterDataItemDto,
  ProductDto,
  ProductPriceDto,
  ProductVariantDto,
  ProductionStageDto,
} from './product.dto';
import { ProductService } from './product.service';
import {
  CollectionResponse,
  MasterDataItemResponse,
  ProductResponse,
  ProductPriceResponse,
  ProductVariantResponse,
  ProductionStageResponse,
  SingleResponse,
} from './product.types';

@Controller('product')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('colors')
  @RequireAnyPermissions('settings.view', 'warehouse.view', 'sales.view', 'production.view')
  getColors(
    @CurrentContext() context: RequestContext,
  ): Promise<CollectionResponse<MasterDataItemResponse>> {
    return this.productService.getColors(context);
  }

  @Post('colors')
  @RequirePermissions('settings.write')
  createColor(
    @CurrentContext() context: RequestContext,
    @Body() dto: MasterDataItemDto,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.productService.createColor(context, dto);
  }

  @Patch('colors/:id')
  @RequirePermissions('settings.write')
  updateColor(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
    @Body() dto: MasterDataItemDto,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.productService.updateColor(context, id, dto);
  }

  @Post('colors/:id/archive')
  @RequirePermissions('settings.write')
  archiveColor(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.productService.archiveColor(context, id);
  }

  @Get('materials')
  // Warehouse/Seller/Shift need read-only catalog for receipts and orders.
  @RequireAnyPermissions('settings.view', 'warehouse.view', 'sales.view', 'production.view')
  getMaterials(
    @CurrentContext() context: RequestContext,
  ): Promise<CollectionResponse<MasterDataItemResponse>> {
    return this.productService.getMaterials(context);
  }

  @Post('materials')
  @RequirePermissions('settings.write')
  createMaterial(
    @CurrentContext() context: RequestContext,
    @Body() dto: MasterDataItemDto,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.productService.createMaterial(context, dto);
  }

  @Patch('materials/:id')
  @RequirePermissions('settings.write')
  updateMaterial(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
    @Body() dto: MasterDataItemDto,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.productService.updateMaterial(context, id, dto);
  }

  @Post('materials/:id/archive')
  @RequirePermissions('settings.write')
  archiveMaterial(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.productService.archiveMaterial(context, id);
  }

  @Get('seasons')
  @RequireAnyPermissions('settings.view', 'warehouse.view', 'sales.view', 'production.view')
  getSeasons(
    @CurrentContext() context: RequestContext,
  ): Promise<CollectionResponse<MasterDataItemResponse>> {
    return this.productService.getSeasons(context);
  }

  @Post('seasons')
  @RequirePermissions('settings.write')
  createSeason(
    @CurrentContext() context: RequestContext,
    @Body() dto: MasterDataItemDto,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.productService.createSeason(context, dto);
  }

  @Patch('seasons/:id')
  @RequirePermissions('settings.write')
  updateSeason(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
    @Body() dto: MasterDataItemDto,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.productService.updateSeason(context, id, dto);
  }

  @Post('seasons/:id/archive')
  @RequirePermissions('settings.write')
  archiveSeason(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
  ): Promise<SingleResponse<MasterDataItemResponse>> {
    return this.productService.archiveSeason(context, id);
  }

  @Get('stages')
  @RequireAnyPermissions('settings.view', 'warehouse.view', 'sales.view', 'production.view')
  getStages(
    @CurrentContext() context: RequestContext,
  ): Promise<CollectionResponse<ProductionStageResponse>> {
    return this.productService.getStages(context);
  }

  @Post('stages')
  @RequirePermissions('settings.write')
  createStage(
    @CurrentContext() context: RequestContext,
    @Body() dto: ProductionStageDto,
  ): Promise<SingleResponse<ProductionStageResponse>> {
    return this.productService.createStage(context, dto);
  }

  @Patch('stages/:id')
  @RequirePermissions('settings.write')
  updateStage(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
    @Body() dto: ProductionStageDto,
  ): Promise<SingleResponse<ProductionStageResponse>> {
    return this.productService.updateStage(context, id, dto);
  }

  @Post('stages/:id/archive')
  @RequirePermissions('settings.write')
  archiveStage(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
  ): Promise<SingleResponse<ProductionStageResponse>> {
    return this.productService.archiveStage(context, id);
  }

  @Get('products')
  @RequireAnyPermissions('settings.view', 'warehouse.view', 'sales.view', 'production.view')
  getProducts(
    @CurrentContext() context: RequestContext,
  ): Promise<CollectionResponse<ProductResponse>> {
    return this.productService.getProducts(context);
  }

  @Post('products')
  @RequirePermissions('settings.write')
  createProduct(
    @CurrentContext() context: RequestContext,
    @Body() dto: ProductDto,
  ): Promise<SingleResponse<ProductResponse>> {
    return this.productService.createProduct(context, dto);
  }

  @Patch('products/:id')
  @RequirePermissions('settings.write')
  updateProduct(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
    @Body() dto: ProductDto,
  ): Promise<SingleResponse<ProductResponse>> {
    return this.productService.updateProduct(context, id, dto);
  }

  @Post('products/:id/archive')
  @RequirePermissions('settings.write')
  archiveProduct(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
  ): Promise<SingleResponse<ProductResponse>> {
    return this.productService.archiveProduct(context, id);
  }

  @Post('products/:productId/variants')
  @RequirePermissions('settings.write')
  createVariant(
    @CurrentContext() context: RequestContext,
    @Param('productId') productId: string,
    @Body() dto: ProductVariantDto,
  ): Promise<SingleResponse<ProductVariantResponse>> {
    return this.productService.createVariant(context, productId, dto);
  }

  @Patch('variants/:id')
  @RequirePermissions('settings.write')
  updateVariant(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
    @Body() dto: ProductVariantDto,
  ): Promise<SingleResponse<ProductVariantResponse>> {
    return this.productService.updateVariant(context, id, dto);
  }

  @Post('variants/:id/archive')
  @RequirePermissions('settings.write')
  archiveVariant(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
  ): Promise<SingleResponse<ProductVariantResponse>> {
    return this.productService.archiveVariant(context, id);
  }


  @Get('variants/:variantId/active-price')
  @RequireAnyPermissions('sales.view', 'sales.write')
  getActiveVariantPrice(
    @CurrentContext() context: RequestContext,
    @Param('variantId') variantId: string,
  ): Promise<SingleResponse<ProductPriceResponse | null>> {
    return this.productService.getActiveVariantPrice(context, variantId);
  }

  @Get('variants/:variantId/prices')
  @RequirePermissions('settings.view')
  getVariantPrices(
    @CurrentContext() context: RequestContext,
    @Param('variantId') variantId: string,
  ): Promise<CollectionResponse<ProductPriceResponse>> {
    return this.productService.getVariantPrices(context, variantId);
  }

  @Post('variants/:variantId/prices')
  @RequirePermissions('settings.write')
  createVariantPrice(
    @CurrentContext() context: RequestContext,
    @Param('variantId') variantId: string,
    @Body() dto: ProductPriceDto,
  ): Promise<SingleResponse<ProductPriceResponse>> {
    return this.productService.createVariantPrice(context, variantId, dto);
  }
}
