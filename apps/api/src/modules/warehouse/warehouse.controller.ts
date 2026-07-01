import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import {
  CreateFinishedProductReceiptDto,
  CreateMaterialReceiptDto,
  CreateStockCorrectionDto,
} from './warehouse.dto';
import { WarehouseService } from './warehouse.service';
import {
  CollectionResponse,
  FinishedProductReceiptResponse,
  MaterialReceiptResponse,
  MaterialStockResponse,
  ProductStockResponse,
  StockCorrectionResponse,
  StockMovementResponse,
  WarehouseStockSummaryResponse,
  WarehouseZoneResponse,
} from './warehouse.types';

@Controller('warehouse')
@RequirePermissions('warehouse.view')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post('finished-product-receipts')
  @RequirePermissions('warehouse.write')
  createFinishedProductReceipt(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateFinishedProductReceiptDto,
  ): Promise<FinishedProductReceiptResponse> {
    return this.warehouseService.createFinishedProductReceipt(context, dto);
  }

  @Post('material-receipts')
  @RequirePermissions('warehouse.write')
  createMaterialReceipt(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateMaterialReceiptDto,
  ): Promise<MaterialReceiptResponse> {
    return this.warehouseService.createMaterialReceipt(context, dto);
  }

  @Post('stock-corrections')
  @RequirePermissions('warehouse.write')
  createStockCorrection(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateStockCorrectionDto,
  ): Promise<StockCorrectionResponse> {
    return this.warehouseService.createStockCorrection(context, dto);
  }

  @Get('stock')
  getStock(@CurrentContext() context: RequestContext): Promise<CollectionResponse<ProductStockResponse>> {
    return this.warehouseService.getStock(context);
  }

  @Get('material-stock')
  getMaterialStock(
    @CurrentContext() context: RequestContext,
  ): Promise<CollectionResponse<MaterialStockResponse>> {
    return this.warehouseService.getMaterialStock(context);
  }

  @Get('movements')
  getMovements(@CurrentContext() context: RequestContext): Promise<CollectionResponse<StockMovementResponse>> {
    return this.warehouseService.getMovements(context);
  }

  @Get('zones')
  getZones(@CurrentContext() context: RequestContext): Promise<CollectionResponse<WarehouseZoneResponse>> {
    return this.warehouseService.getZones(context);
  }

  @Get('stock-summary')
  getStockSummary(@CurrentContext() context: RequestContext): Promise<WarehouseStockSummaryResponse> {
    return this.warehouseService.getStockSummary(context);
  }
}
