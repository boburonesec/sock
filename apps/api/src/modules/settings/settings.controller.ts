import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import { CreateSalaryRateDto } from './settings.dto';
import { SettingsService } from './settings.service';
import {
  CollectionResponse,
  SalaryRateResponse,
  SettingsOverviewResponse,
  SingleResponse,
} from './settings.types';

@Controller('settings')
@RequirePermissions('settings.view')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('overview')
  getOverview(@CurrentContext() context: RequestContext): Promise<SettingsOverviewResponse> {
    return this.settingsService.getOverview(context);
  }

  @Get('roles')
  getRoles(@CurrentContext() context: RequestContext) {
    return this.settingsService.getRoles(context);
  }

  @Get('permissions')
  getPermissions() {
    return this.settingsService.getPermissions();
  }

  @Get('expense-categories')
  getExpenseCategories(@CurrentContext() context: RequestContext) {
    return this.settingsService.getExpenseCategories(context);
  }

  @Get('salary-rates')
  getSalaryRates(
    @CurrentContext() context: RequestContext,
  ): Promise<CollectionResponse<SalaryRateResponse>> {
    return this.settingsService.getSalaryRates(context);
  }

  @Post('salary-rates')
  @RequirePermissions('settings.write')
  createSalaryRate(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateSalaryRateDto,
  ): Promise<SingleResponse<SalaryRateResponse>> {
    return this.settingsService.createSalaryRate(context, dto);
  }

  @Patch('salary-rates/:id/archive')
  @RequirePermissions('settings.write')
  archiveSalaryRate(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
  ): Promise<SingleResponse<SalaryRateResponse>> {
    return this.settingsService.archiveSalaryRate(context, id);
  }
}
