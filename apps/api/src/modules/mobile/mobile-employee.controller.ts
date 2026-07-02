import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import { MobileEmployeeService } from './mobile-employee.service';
import {
  MobileEmployeeActivitiesResponse,
  MobileEmployeeAdvancesResponse,
  MobileEmployeeMeResponse,
  MobileEmployeePayrollResponse,
} from './mobile-employee.types';

@Controller('mobile/employee')
@UseGuards(JwtAuthGuard)
export class MobileEmployeeController {
  constructor(private readonly mobileEmployeeService: MobileEmployeeService) {}

  @Get('me')
  getMe(@CurrentContext() context: RequestContext): Promise<MobileEmployeeMeResponse> {
    return this.mobileEmployeeService.getMe(context);
  }

  @Get('activities')
  getActivities(
    @CurrentContext() context: RequestContext,
  ): Promise<MobileEmployeeActivitiesResponse> {
    return this.mobileEmployeeService.getActivities(context);
  }

  @Get('payroll')
  getPayroll(
    @CurrentContext() context: RequestContext,
  ): Promise<MobileEmployeePayrollResponse> {
    return this.mobileEmployeeService.getPayroll(context);
  }

  @Get('advances')
  getAdvances(
    @CurrentContext() context: RequestContext,
  ): Promise<MobileEmployeeAdvancesResponse> {
    return this.mobileEmployeeService.getAdvances(context);
  }
}

