import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import {
  CreateEmployeeAdjustmentDto,
  CreatePayrollPeriodDto,
  PayPayrollPeriodDto,
} from './finance.dto';
import { FinanceService } from './finance.service';
import {
  AdvanceResponse,
  CollectionResponse,
  ExpenseResponse,
  FinanceSummaryResponse,
  PayrollItemResponse,
  PayrollPaymentResponse,
  PayrollPeriodResponse,
  SingleResponse,
} from './finance.types';

@Controller('finance')
@RequirePermissions('finance.view')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('expenses')
  getExpenses(@CurrentContext() context: RequestContext): Promise<CollectionResponse<ExpenseResponse>> {
    return this.financeService.getExpenses(context);
  }

  @Get('summary')
  getSummary(@CurrentContext() context: RequestContext): Promise<FinanceSummaryResponse> {
    return this.financeService.getSummary(context);
  }

  @Get('advances')
  getAdvances(@CurrentContext() context: RequestContext): Promise<CollectionResponse<AdvanceResponse>> {
    return this.financeService.getAdvances(context);
  }

  @Post('advances')
  @RequirePermissions('finance.write')
  createAdvance(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateEmployeeAdjustmentDto,
  ): Promise<SingleResponse<AdvanceResponse>> {
    return this.financeService.createAdvance(context, dto);
  }

  @Get('bonuses')
  getBonuses(@CurrentContext() context: RequestContext): Promise<CollectionResponse<AdvanceResponse>> {
    return this.financeService.getBonuses(context);
  }

  @Post('bonuses')
  @RequirePermissions('finance.write')
  createBonus(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateEmployeeAdjustmentDto,
  ): Promise<SingleResponse<AdvanceResponse>> {
    return this.financeService.createBonus(context, dto);
  }

  @Get('penalties')
  getPenalties(@CurrentContext() context: RequestContext): Promise<CollectionResponse<AdvanceResponse>> {
    return this.financeService.getPenalties(context);
  }

  @Post('penalties')
  @RequirePermissions('finance.write')
  createPenalty(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateEmployeeAdjustmentDto,
  ): Promise<SingleResponse<AdvanceResponse>> {
    return this.financeService.createPenalty(context, dto);
  }

  @Get('payroll-periods')
  getPayrollPeriods(@CurrentContext() context: RequestContext): Promise<CollectionResponse<PayrollPeriodResponse>> {
    return this.financeService.getPayrollPeriods(context);
  }

  @Post('payroll-periods')
  @RequirePermissions('finance.write')
  createPayrollPeriod(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreatePayrollPeriodDto,
  ): Promise<SingleResponse<PayrollPeriodResponse>> {
    return this.financeService.createPayrollPeriod(context, dto);
  }

  @Post('payroll-periods/:id/calculate')
  @RequirePermissions('finance.write')
  calculatePayrollPeriod(
    @CurrentContext() context: RequestContext,
    @Param('id') payrollPeriodId: string,
  ): Promise<SingleResponse<PayrollPeriodResponse>> {
    return this.financeService.calculatePayrollPeriod(context, payrollPeriodId);
  }

  @Post('payroll-periods/:id/close')
  @RequirePermissions('finance.write')
  closePayrollPeriod(
    @CurrentContext() context: RequestContext,
    @Param('id') payrollPeriodId: string,
  ): Promise<SingleResponse<PayrollPeriodResponse>> {
    return this.financeService.closePayrollPeriod(context, payrollPeriodId);
  }

  @Post('payroll-periods/:id/pay')
  @RequirePermissions('finance.write')
  payPayrollPeriod(
    @CurrentContext() context: RequestContext,
    @Param('id') payrollPeriodId: string,
    @Body() dto: PayPayrollPeriodDto,
  ): Promise<SingleResponse<PayrollPaymentResponse>> {
    return this.financeService.payPayrollPeriod(context, payrollPeriodId, dto);
  }

  @Get('payroll-periods/:id/items')
  getPayrollPeriodItems(
    @CurrentContext() context: RequestContext,
    @Param('id') payrollPeriodId: string,
  ): Promise<CollectionResponse<PayrollItemResponse>> {
    return this.financeService.getPayrollPeriodItems(context, payrollPeriodId);
  }
}
