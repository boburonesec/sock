import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import { AttendanceQueryDto } from './attendance.dto';
import { AttendanceService } from './attendance.service';
import { AttendanceOverviewResponse } from './attendance.types';

@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('overview')
  @RequirePermissions('attendance.view')
  getOverview(
    @CurrentContext() context: RequestContext,
    @Query() query: AttendanceQueryDto,
  ): Promise<AttendanceOverviewResponse> {
    return this.attendanceService.getOverview(context, query);
  }
}
