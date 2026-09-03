import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import {
  ClosePayrollPeriodDto,
  CreateEmployeeAdjustmentDto,
  CreateExpenseDto,
  CreatePayrollPeriodDto,
  PayPayrollPeriodDto,
} from './finance.dto';
import { FinanceService } from './finance.service';
import {
  AdvanceResponse,
  CollectionResponse,
  ExpenseResponse,
  ExpensesCollectionResponse,
  FinanceSummaryResponse,
  PayrollItemResponse,
  PayrollEmployeeResponse,
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
  getExpenses(@CurrentContext() context: RequestContext): Promise<ExpensesCollectionResponse> {
    return this.financeService.getExpenses(context);
  }

  @Post('expenses')
  @RequirePermissions('finance.write')
  createExpense(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateExpenseDto,
  ): Promise<SingleResponse<ExpenseResponse>> {
    return this.financeService.createExpense(context, dto);
  }

  @Post('expenses/:id/approve')
  @RequirePermissions('expense.approve')
  approveExpense(
    @CurrentContext() context: RequestContext,
    @Param('id') expenseId: string,
  ): Promise<SingleResponse<ExpenseResponse>> {
    return this.financeService.approveExpense(context, expenseId);
  }

  @Post('expenses/:id/reject')
  @RequirePermissions('expense.approve')
  rejectExpense(
    @CurrentContext() context: RequestContext,
    @Param('id') expenseId: string,
  ): Promise<SingleResponse<ExpenseResponse>> {
    return this.financeService.rejectExpense(context, expenseId);
  }

  @Post('expenses/:id/pay')
  @RequirePermissions('expense.pay')
  payExpense(
    @CurrentContext() context: RequestContext,
    @Param('id') expenseId: string,
  ): Promise<SingleResponse<ExpenseResponse>> {
    return this.financeService.payExpense(context, expenseId);
  }

  @Post('expenses/:id/cancel')
  @RequirePermissions('finance.write')
  cancelExpense(
    @CurrentContext() context: RequestContext,
    @Param('id') expenseId: string,
  ): Promise<SingleResponse<ExpenseResponse>> {
    return this.financeService.cancelExpense(context, expenseId);
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

  @Post('advances/:id/approve')
  @RequirePermissions('expense.approve')
  approveAdvance(
    @CurrentContext() context: RequestContext,
    @Param('id') advanceId: string,
  ): Promise<SingleResponse<AdvanceResponse>> {
    return this.financeService.approveAdvance(context, advanceId);
  }

  @Post('advances/:id/reject')
  @RequirePermissions('expense.approve')
  rejectAdvance(
    @CurrentContext() context: RequestContext,
    @Param('id') advanceId: string,
  ): Promise<SingleResponse<AdvanceResponse>> {
    return this.financeService.rejectAdvance(context, advanceId);
  }

  @Post('advances/:id/pay')
  @RequirePermissions('expense.pay')
  payAdvance(
    @CurrentContext() context: RequestContext,
    @Param('id') advanceId: string,
  ): Promise<SingleResponse<AdvanceResponse>> {
    return this.financeService.payAdvance(context, advanceId);
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

  @Get('payroll-employees')
  getPayrollEmployees(
    @CurrentContext() context: RequestContext,
  ): Promise<CollectionResponse<PayrollEmployeeResponse>> {
    return this.financeService.getPayrollEmployees(context);
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
    @Body() dto: ClosePayrollPeriodDto,
  ): Promise<SingleResponse<PayrollPeriodResponse>> {
    return this.financeService.closePayrollPeriod(context, payrollPeriodId, dto);
  }

  @Post('payroll-periods/:id/approve')
  @RequirePermissions('payroll.approve')
  approvePayrollPeriod(
    @CurrentContext() context: RequestContext,
    @Param('id') payrollPeriodId: string,
  ): Promise<SingleResponse<PayrollPeriodResponse>> {
    return this.financeService.approvePayrollPeriod(context, payrollPeriodId);
  }

  @Post('payroll-periods/:id/pay')
  @RequirePermissions('expense.pay')
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

  @Get('payroll-periods/:id/readiness')
  getPayrollPeriodReadiness(@CurrentContext() context: RequestContext, @Param('id') payrollPeriodId: string) {
    return this.financeService.getPayrollPeriodReadiness(context, payrollPeriodId);
  }
}
