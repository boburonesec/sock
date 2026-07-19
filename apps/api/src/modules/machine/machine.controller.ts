import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import {
  ConfigureInspectionSlotsDto,
  CreateMachineAssignmentDto,
  CreateMachineDto,
  CreateMachinePieceRateDto,
  CreateMaintenanceTaskDto,
  CreateMeasurementSpecificationDto,
  ResolveQualityIssueDto,
  SubmitInspectionDto,
  UpdateMachineDto,
  UpdateMaintenanceTaskDto,
} from './machine.dto';
import { MachineService } from './machine.service';

@Controller('machines')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MachineController {
  constructor(private readonly service: MachineService) {}

  @Get('lookups') @RequirePermissions('machines.view') lookups(@CurrentContext() c: RequestContext) { return this.service.lookups(c); }

  @Get() @RequirePermissions('machines.view') list(@CurrentContext() c: RequestContext) { return this.service.list(c); }
  @Post() @RequirePermissions('machines.write') create(@CurrentContext() c: RequestContext, @Body() d: CreateMachineDto) { return this.service.create(c, d); }
  @Patch(':id') @RequirePermissions('machines.write') update(@CurrentContext() c: RequestContext, @Param('id') id: string, @Body() d: UpdateMachineDto) { return this.service.update(c, id, d); }

  @Get('assignments/active') @RequirePermissions('machines.view') assignments(@CurrentContext() c: RequestContext) { return this.service.listAssignments(c); }
  @Post('assignments') @RequirePermissions('machines.write') assign(@CurrentContext() c: RequestContext, @Body() d: CreateMachineAssignmentDto) { return this.service.assign(c, d); }

  @Get('piece-rates') @RequirePermissions('machines.view') rates(@CurrentContext() c: RequestContext) { return this.service.listRates(c); }
  @Post('piece-rates') @RequirePermissions('machines.write') rate(@CurrentContext() c: RequestContext, @Body() d: CreateMachinePieceRateDto) { return this.service.createRate(c, d); }

  @Get('tasks') @RequirePermissions('maintenance.view') tasks(@CurrentContext() c: RequestContext) { return this.service.listTasks(c); }
  @Post('tasks') @RequirePermissions('maintenance.write') task(@CurrentContext() c: RequestContext, @Body() d: CreateMaintenanceTaskDto) { return this.service.createTask(c, d); }
  @Patch('tasks/:id') @RequirePermissions('maintenance.write') updateTask(@CurrentContext() c: RequestContext, @Param('id') id: string, @Body() d: UpdateMaintenanceTaskDto) { return this.service.updateTask(c, id, d); }

  @Post('products/:productId/specifications') @RequirePermissions('quality.write') specification(@CurrentContext() c: RequestContext, @Param('productId') id: string, @Body() d: CreateMeasurementSpecificationDto) { return this.service.createSpecification(c, id, d); }
  @Post('specifications/:id/activate') @RequirePermissions('quality.write') activate(@CurrentContext() c: RequestContext, @Param('id') id: string) { return this.service.activateSpecification(c, id); }
  @Post('inspection-slots') @RequirePermissions('quality.write') slots(@CurrentContext() c: RequestContext, @Body() d: ConfigureInspectionSlotsDto) { return this.service.configureSlots(c, d); }
  @Get('inspection-rounds/mine') @RequirePermissions('quality.view') rounds(@CurrentContext() c: RequestContext) { return this.service.myRounds(c); }
  @Post('inspection-rounds/:id/measurements') @RequirePermissions('quality.write') inspect(@CurrentContext() c: RequestContext, @Param('id') id: string, @Body() d: SubmitInspectionDto) { return this.service.submitMeasurements(c, id, d); }
  @Get('quality-issues') @RequirePermissions('quality.view') issues(@CurrentContext() c: RequestContext) { return this.service.listIssues(c); }
  @Post('quality-issues/:id/resolve') @RequirePermissions('quality.write') resolve(@CurrentContext() c: RequestContext, @Param('id') id: string, @Body() d: ResolveQualityIssueDto) { return this.service.resolveIssue(c, id, d); }
  @Post('quality-issues/:id/recheck') @RequirePermissions('quality.write') recheck(@CurrentContext() c: RequestContext, @Param('id') id: string, @Body() d: SubmitInspectionDto) { return this.service.recheckIssue(c, id, d); }
  @Post('quality-issues/:id/hold') @RequirePermissions('production.write') hold(@CurrentContext() c: RequestContext, @Param('id') id: string) { return this.service.holdRun(c, id); }
}
