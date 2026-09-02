import { Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import { CurrentFactoryTvContext } from './current-factory-tv-context.decorator';
import { DashboardService } from './dashboard.service';
import {
  ExecutiveSummaryResponse,
  FactoryTvSummaryResponse,
} from './dashboard.types';
import {
  FactoryTvCredentialCreated,
  FactoryTvCredentialService,
  FactoryTvCredentialStatus,
} from './factory-tv-credential.service';
import { FactoryTvAccessGuard } from './factory-tv-access.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly factoryTvCredentialService: FactoryTvCredentialService,
  ) {}

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
  getFactoryTvSummary(
    @CurrentFactoryTvContext() resolvedContext: { tenantId: string; factoryId: string },
  ): Promise<FactoryTvSummaryResponse> {
    return this.dashboardService.getFactoryTvSummary(resolvedContext);
  }

  // Owner-only: each factory manages its own Factory TV link independently —
  // there is no shared platform token to hand out anymore.
  @Get('factory-tv-credential')
  @RequirePermissions('dashboard.view')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async getFactoryTvCredentialStatus(
    @CurrentContext() context: RequestContext,
  ): Promise<{ data: FactoryTvCredentialStatus }> {
    return { data: await this.factoryTvCredentialService.getStatus(context) };
  }

  @Post('factory-tv-credential')
  @RequirePermissions('dashboard.view')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async generateFactoryTvCredential(
    @CurrentContext() context: RequestContext,
  ): Promise<{ data: FactoryTvCredentialCreated }> {
    return { data: await this.factoryTvCredentialService.generate(context) };
  }

  @Delete('factory-tv-credential')
  @RequirePermissions('dashboard.view')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async revokeFactoryTvCredential(
    @CurrentContext() context: RequestContext,
  ): Promise<{ data: { revoked: true } }> {
    await this.factoryTvCredentialService.revoke(context);
    return { data: { revoked: true } };
  }
}
