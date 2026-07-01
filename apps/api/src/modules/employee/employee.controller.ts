import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import { CreateEmployeeDto, UpdateEmployeeDto } from './employee.dto';
import { EmployeeService } from './employee.service';
import { CollectionResponse, EmployeeResponse, SingleResponse } from './employee.types';

@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get()
  @RequirePermissions('employees.view')
  getEmployees(@CurrentContext() context: RequestContext): Promise<CollectionResponse<EmployeeResponse>> {
    return this.employeeService.getEmployees(context);
  }

  @Post()
  @RequirePermissions('employees.write')
  createEmployee(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateEmployeeDto,
  ): Promise<SingleResponse<EmployeeResponse>> {
    return this.employeeService.createEmployee(context, dto);
  }

  @Patch(':id')
  @RequirePermissions('employees.write')
  updateEmployee(
    @CurrentContext() context: RequestContext,
    @Param('id') employeeId: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<SingleResponse<EmployeeResponse>> {
    return this.employeeService.updateEmployee(context, employeeId, dto);
  }

  @Post(':id/inactivate')
  @RequirePermissions('employees.write')
  inactivateEmployee(
    @CurrentContext() context: RequestContext,
    @Param('id') employeeId: string,
  ): Promise<SingleResponse<EmployeeResponse>> {
    return this.employeeService.inactivateEmployee(context, employeeId);
  }
}
