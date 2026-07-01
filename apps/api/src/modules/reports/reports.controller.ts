import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import { ReportsService } from './reports.service';
import { ReportsOverviewResponse } from './reports.types';

@Controller('reports')
@RequirePermissions('reports.view')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  getOverview(@CurrentContext() context: RequestContext): Promise<ReportsOverviewResponse> {
    return this.reportsService.getOverview(context);
  }
}
