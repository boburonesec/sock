import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import { DashboardService } from './dashboard.service';
import {
  ExecutiveSummaryResponse,
  FactoryTvSummaryResponse,
} from './dashboard.types';
import { FactoryTvAccessGuard } from './factory-tv-access.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('executive-summary')
  @RequirePermissions('dashboard.view')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  getExecutiveSummary(
    @CurrentContext() context: RequestContext,
  ): Promise<ExecutiveSummaryResponse> {
    return this.dashboardService.getExecutiveSummary(context);
  }

  @Get('factory-tv-summary')
  @UseGuards(FactoryTvAccessGuard)
  getFactoryTvSummary(): Promise<FactoryTvSummaryResponse> {
    return this.dashboardService.getFactoryTvSummary();
  }
}
