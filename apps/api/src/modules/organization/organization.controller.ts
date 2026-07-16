import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import {
  CreateOrganizationFactoryDto,
  CreateOrganizationManagerDto,
  CreateOrganizationUserDto,
  UpdateOrganizationUserFactoryAccessDto,
  UpdateOrganizationUserPasswordDto,
  LinkOrganizationUserEmployeeDto,
} from './organization.dto';
import { OrganizationService } from './organization.service';

@Controller('organization')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get('factories')
  getFactories(@CurrentContext() context: RequestContext) {
    return this.organizationService.getFactories(context);
  }

  @Post('factories')
  createFactory(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateOrganizationFactoryDto,
  ) {
    return this.organizationService.createFactory(context, dto);
  }

  @Get('users')
  getUsers(@CurrentContext() context: RequestContext) {
    return this.organizationService.getUsers(context);
  }

  @Post('managers')
  createManager(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateOrganizationManagerDto,
  ) {
    return this.organizationService.createManager(context, dto);
  }

  @Post('users')
  createUser(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateOrganizationUserDto,
  ) {
    return this.organizationService.createUser(context, dto);
  }

  @Patch('users/:id/password')
  updateUserPassword(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationUserPasswordDto,
  ) {
    return this.organizationService.updateUserPassword(context, id, dto);
  }

  @Patch('users/:id/employee')
  linkUserEmployee(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
    @Body() dto: LinkOrganizationUserEmployeeDto,
  ) {
    return this.organizationService.linkUserEmployee(context, id, dto.employeeId);
  }

  @Patch('users/:id/factory-access')
  updateUserFactoryAccess(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationUserFactoryAccessDto,
  ) {
    return this.organizationService.updateUserFactoryAccess(context, id, dto);
  }
}
