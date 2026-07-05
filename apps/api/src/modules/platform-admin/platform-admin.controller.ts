import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentPlatformAdmin } from '../identity/platform-auth/current-platform-admin.decorator';
import { PlatformJwtAuthGuard } from '../identity/platform-auth/platform-jwt-auth.guard';
import { PlatformAdminContext } from '../identity/platform-auth/platform-auth.types';
import {
  CreatePlatformFactoryDto,
  CreatePlatformOwnerUserDto,
  CreatePlatformTenantDto,
  UpdatePlatformTenantUserPasswordDto,
} from './platform-admin.dto';
import { PlatformAdminService } from './platform-admin.service';

@Controller('platform-admin')
@UseGuards(PlatformJwtAuthGuard)
export class PlatformAdminController {
  constructor(private readonly platformAdminService: PlatformAdminService) {}

  @Get('tenants')
  listTenants() {
    return this.platformAdminService.listTenants();
  }

  @Post('tenants')
  createTenant(
    @Body() dto: CreatePlatformTenantDto,
    @CurrentPlatformAdmin() platformAdmin: PlatformAdminContext,
  ) {
    return this.platformAdminService.createTenant(dto, platformAdmin);
  }

  @Get('tenants/:id')
  getTenant(@Param('id') id: string) {
    return this.platformAdminService.getTenant(id);
  }

  @Post('tenants/:id/factories')
  createFactory(
    @Param('id') id: string,
    @Body() dto: CreatePlatformFactoryDto,
    @CurrentPlatformAdmin() platformAdmin: PlatformAdminContext,
  ) {
    return this.platformAdminService.createFactory(id, dto, platformAdmin);
  }

  @Post('tenants/:id/owner-users')
  createOwnerUser(
    @Param('id') id: string,
    @Body() dto: CreatePlatformOwnerUserDto,
    @CurrentPlatformAdmin() platformAdmin: PlatformAdminContext,
  ) {
    return this.platformAdminService.createOwnerUser(id, dto, platformAdmin);
  }

  @Post('tenants/:id/users/:userId/password')
  updateTenantUserPassword(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdatePlatformTenantUserPasswordDto,
    @CurrentPlatformAdmin() platformAdmin: PlatformAdminContext,
  ) {
    return this.platformAdminService.updateTenantUserPassword(id, userId, dto, platformAdmin);
  }

  @Post('tenants/:id/activate')
  activateTenant(
    @Param('id') id: string,
    @CurrentPlatformAdmin() platformAdmin: PlatformAdminContext,
  ) {
    return this.platformAdminService.activateTenant(id, platformAdmin);
  }

  @Post('tenants/:id/suspend')
  suspendTenant(
    @Param('id') id: string,
    @CurrentPlatformAdmin() platformAdmin: PlatformAdminContext,
  ) {
    return this.platformAdminService.suspendTenant(id, platformAdmin);
  }

  @Get('tenants/:id/health')
  getTenantHealth(@Param('id') id: string) {
    return this.platformAdminService.getTenantHealth(id);
  }
}
