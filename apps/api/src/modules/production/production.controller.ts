import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import {
  CreateDefectDto,
  CreateProductionBatchDto,
  CreateStageMovementDto,
  CreateWorkerActivityDto,
  CreateProductionRunDto,
  CreateProductionRunIntakeDto,
  ChangeProductionRunStatusDto,
} from './production.dto';
import { ProductionService } from './production.service';
import {
  CollectionResponse,
  DefectCreationResponse,
  DefectResponse,
  ProductionBatchCreationResponse,
  StageMovementCreationResponse,
  ProductionOperationsSummaryResponse,
  StageInventoryResponse,
  StageMovementResponse,
  WorkerActivityCreationResponse,
  WorkerActivityResponse,
} from './production.types';

@Controller('production')
@RequirePermissions('production.view')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get('runs')
  getRuns(@CurrentContext() context: RequestContext) { return this.productionService.getRuns(context); }

  @Post('runs')
  @RequirePermissions('production.write')
  createRun(@CurrentContext() context: RequestContext, @Body() dto: CreateProductionRunDto) { return this.productionService.createRun(context, dto); }

  @Patch('runs/:id/status')
  @RequirePermissions('production.write')
  changeRunStatus(@CurrentContext() context: RequestContext, @Param('id') id: string, @Body() dto: ChangeProductionRunStatusDto) { return this.productionService.changeRunStatus(context, id, dto); }

  @Post('runs/:id/intakes')
  @RequirePermissions('production.write')
  createRunIntake(@CurrentContext() context: RequestContext, @Param('id') id: string, @Body() dto: CreateProductionRunIntakeDto) { return this.productionService.createRunIntake(context, id, dto); }

  @Post('batches')
  @RequirePermissions('production.write')
  createBatch(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateProductionBatchDto,
  ): Promise<ProductionBatchCreationResponse> {
    return this.productionService.createBatch(context, dto);
  }

  @Post('stage-movements')
  @RequirePermissions('production.write')
  createStageMovement(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateStageMovementDto,
  ): Promise<StageMovementCreationResponse> {
    return this.productionService.createStageMovement(context, dto);
  }

  @Post('worker-activities')
  @RequirePermissions('production.write')
  createWorkerActivity(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateWorkerActivityDto,
  ): Promise<WorkerActivityCreationResponse> {
    return this.productionService.createWorkerActivity(context, dto);
  }

  @Post('defects')
  @RequirePermissions('production.write')
  createDefect(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateDefectDto,
  ): Promise<DefectCreationResponse> {
    return this.productionService.createDefect(context, dto);
  }

  @Get('stage-inventory')
  getStageInventory(
    @CurrentContext() context: RequestContext,
  ): Promise<CollectionResponse<StageInventoryResponse>> {
    return this.productionService.getStageInventory(context);
  }

  @Get('recent-movements')
  getRecentMovements(
    @CurrentContext() context: RequestContext,
  ): Promise<CollectionResponse<StageMovementResponse>> {
    return this.productionService.getRecentMovements(context);
  }

  @Get('worker-activities')
  getWorkerActivities(
    @CurrentContext() context: RequestContext,
  ): Promise<CollectionResponse<WorkerActivityResponse>> {
    return this.productionService.getWorkerActivities(context);
  }

  @Get('defects')
  getDefects(
    @CurrentContext() context: RequestContext,
  ): Promise<CollectionResponse<DefectResponse>> {
    return this.productionService.getDefects(context);
  }

  @Get('operations-summary')
  getOperationsSummary(
    @CurrentContext() context: RequestContext,
  ): Promise<ProductionOperationsSummaryResponse> {
    return this.productionService.getOperationsSummary(context);
  }

  /**
   * Shift Receiver has production.view but not employees.view/settings.view.
   * Board forms need these limited lookups without opening full modules.
   */
  @Get('lookups/employees')
  getLookupEmployees(@CurrentContext() context: RequestContext) {
    return this.productionService.getLookupEmployees(context);
  }

  @Get('lookups/product-variants')
  getLookupProductVariants(@CurrentContext() context: RequestContext) {
    return this.productionService.getLookupProductVariants(context);
  }
}
