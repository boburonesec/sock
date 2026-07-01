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

  /**
   * Public exception for the factory monitor route. The frontend `/tv` route is
   * intentionally outside the authenticated app shell in V1, so this endpoint
   * remains on temporary dev context until a display-token design is approved.
   */
  @Get('factory-tv-summary')
  getFactoryTvSummary(): Promise<FactoryTvSummaryResponse> {
    return this.dashboardService.getFactoryTvSummary();
  }
}
