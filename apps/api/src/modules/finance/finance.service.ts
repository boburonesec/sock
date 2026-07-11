import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployeeAdjustmentStatus,
  EmployeeAdjustmentType,
  ExpenseStatus,
  PayrollItemStatus,
  PayrollPeriodStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import {
  CreateEmployeeAdjustmentDto,
  CreatePayrollPeriodDto,
  PayPayrollPeriodDto,
} from './finance.dto';
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

const SUMMARY_RECENT_LIMIT = 5;
const TASHKENT_UTC_OFFSET_HOURS = 5;
const PENDING_ADVANCE_STATUSES = [
  EmployeeAdjustmentStatus.REQUESTED,
  EmployeeAdjustmentStatus.APPROVED,
];
const ACTIVE_PAYROLL_PERIOD_STATUSES = [
  PayrollPeriodStatus.DRAFT,
  PayrollPeriodStatus.CALCULATED,
  PayrollPeriodStatus.PARTIALLY_PAID,
  PayrollPeriodStatus.PAID,
];
const PAYROLL_APPLICABLE_ADJUSTMENT_STATUSES = [
  EmployeeAdjustmentStatus.APPROVED,
  EmployeeAdjustmentStatus.PAID,
  EmployeeAdjustmentStatus.APPLIED,
];

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getExpenses(context: RequestContext): Promise<CollectionResponse<ExpenseResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const expenses = await this.prisma.expense.findMany({
      where: { tenantId, factoryId },
      orderBy: { requestedAt: 'desc' },
      select: {
        id: true,
        amount: true,
        reason: true,
        status: true,
        requestedAt: true,
        approvedAt: true,
        paidAt: true,
        cancelledAt: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } },
      },
    });

    return {
      data: expenses.map((expense) => ({
        ...expense,
        amount: expense.amount.toString(),
      })),
    };
  }

  async getSummary(context: RequestContext): Promise<FinanceSummaryResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const { startUtc, endUtc } = this.getCurrentTashkentMonthRangeUtc();

    const [
      monthlyExpensesAggregate,
      pendingExpensesAggregate,
      pendingAdvancesAggregate,
      payrollRemainingAggregate,
      recentExpenses,
      recentAdvances,
      payrollPeriods,
    ] = await Promise.all([
      this.prisma.expense.aggregate({
        where: {
          tenantId,
          factoryId,
          status: ExpenseStatus.PAID,
          paidAt: { gte: startUtc, lt: endUtc },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          tenantId,
          factoryId,
          status: ExpenseStatus.REQUESTED,
        },
        _sum: { amount: true },
      }),
      this.prisma.employeeAdjustment.aggregate({
        where: {
          tenantId,
          factoryId,
          type: EmployeeAdjustmentType.ADVANCE,
          status: { in: PENDING_ADVANCE_STATUSES },
        },
        _sum: { amount: true },
      }),
      this.prisma.payrollPeriod.aggregate({
        where: {
          tenantId,
          factoryId,
          status: { in: ACTIVE_PAYROLL_PERIOD_STATUSES },
        },
        _sum: { totalRemainingAmount: true },
      }),
      this.findRecentExpenses(tenantId, factoryId, SUMMARY_RECENT_LIMIT),
      this.findRecentAdvances(tenantId, factoryId, SUMMARY_RECENT_LIMIT),
      this.findRecentPayrollPeriods(tenantId, factoryId, SUMMARY_RECENT_LIMIT),
    ]);

    return {
      data: {
        kpis: {
          monthlyExpenses: this.decimalOrZero(
            monthlyExpensesAggregate._sum.amount,
          ).toString(),
          pendingExpenses: this.decimalOrZero(
            pendingExpensesAggregate._sum.amount,
          ).toString(),
          pendingAdvances: this.decimalOrZero(
            pendingAdvancesAggregate._sum.amount,
          ).toString(),
          payrollRemaining: this.decimalOrZero(
            payrollRemainingAggregate._sum.totalRemainingAmount,
          ).toString(),
        },
        recentExpenses,
        recentAdvances,
        payrollPeriods,
      },
    };
  }

  async getAdvances(context: RequestContext): Promise<CollectionResponse<AdvanceResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const advances = await this.prisma.employeeAdjustment.findMany({
      where: {
        tenantId,
        factoryId,
        type: EmployeeAdjustmentType.ADVANCE,
      },
      orderBy: { requestedAt: 'desc' },
      select: {
        id: true,
        amount: true,
        reason: true,
        status: true,
        requestedAt: true,
        approvedAt: true,
        paidAt: true,
        cancelledAt: true,
        createdAt: true,
        updatedAt: true,
        employee: { select: { id: true, name: true, status: true } },
        payrollPeriod: { select: { id: true, month: true, status: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } },
      },
    });

    return {
      data: advances.map((advance) => ({
        ...advance,
        amount: advance.amount.toString(),
      })),
    };
  }

  async createAdvance(
    context: RequestContext,
    dto: CreateEmployeeAdjustmentDto,
  ): Promise<SingleResponse<AdvanceResponse>> {
    return this.createEmployeeAdjustment(
      context,
      dto,
      EmployeeAdjustmentType.ADVANCE,
      EmployeeAdjustmentStatus.PAID,
      'ADVANCE_CREATED',
    );
  }

  async createBonus(
    context: RequestContext,
    dto: CreateEmployeeAdjustmentDto,
  ): Promise<SingleResponse<AdvanceResponse>> {
    return this.createEmployeeAdjustment(
      context,
      dto,
      EmployeeAdjustmentType.BONUS,
      EmployeeAdjustmentStatus.APPROVED,
      'BONUS_CREATED',
    );
  }

  async getBonuses(context: RequestContext): Promise<CollectionResponse<AdvanceResponse>> {
    return this.listAdjustmentsByType(context, EmployeeAdjustmentType.BONUS);
  }

  async createPenalty(
    context: RequestContext,
    dto: CreateEmployeeAdjustmentDto,
  ): Promise<SingleResponse<AdvanceResponse>> {
    return this.createEmployeeAdjustment(
      context,
      dto,
      EmployeeAdjustmentType.PENALTY,
      EmployeeAdjustmentStatus.APPROVED,
      'PENALTY_CREATED',
    );
  }

  async getPenalties(context: RequestContext): Promise<CollectionResponse<AdvanceResponse>> {
    return this.listAdjustmentsByType(context, EmployeeAdjustmentType.PENALTY);
  }

  private async listAdjustmentsByType(
    context: RequestContext,
    type: EmployeeAdjustmentType,
  ): Promise<CollectionResponse<AdvanceResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const rows = await this.prisma.employeeAdjustment.findMany({
      where: {
        tenantId,
        factoryId,
        type,
      },
      orderBy: { requestedAt: 'desc' },
      select: {
        id: true,
        amount: true,
        reason: true,
        status: true,
        requestedAt: true,
        approvedAt: true,
        paidAt: true,
        cancelledAt: true,
        createdAt: true,
        updatedAt: true,
        employee: { select: { id: true, name: true, status: true } },
        payrollPeriod: { select: { id: true, month: true, status: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } },
      },
    });

    return {
      data: rows.map((row) => ({
        ...row,
        amount: row.amount.toString(),
      })),
    };
  }

  private async createEmployeeAdjustment(
    context: RequestContext,
    dto: CreateEmployeeAdjustmentDto,
    type: EmployeeAdjustmentType,
    status: EmployeeAdjustmentStatus,
    auditAction: string,
  ): Promise<SingleResponse<AdvanceResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const amount = this.parsePositiveDecimal(dto.amount, 'Adjustment amount');
    const reason = dto.reason.trim();

    if (!reason) {
      throw new BadRequestException('Reason is required.');
    }

    const adjustment = await this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findFirst({
        where: {
          id: dto.employeeId,
          tenantId,
          factoryId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: { id: true, name: true, status: true },
      });

      if (!employee) {
        throw new NotFoundException('Active employee not found.');
      }

      const now = new Date();
      const createdAdjustment = await tx.employeeAdjustment.create({
        data: {
          tenantId,
          factoryId,
          employeeId: employee.id,
          type,
          amount,
          reason,
          status,
          requestedByUserId: context.userId,
          approvedByUserId: context.userId,
          paidByUserId:
            type === EmployeeAdjustmentType.ADVANCE ? context.userId : null,
          requestedAt: now,
          approvedAt: now,
          paidAt: type === EmployeeAdjustmentType.ADVANCE ? now : null,
        },
        select: adjustmentSelect,
      });
      const response = this.mapAdjustment(createdAdjustment);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: auditAction,
        entityType: 'EmployeeAdjustment',
        entityId: createdAdjustment.id,
        after: response,
      });

      return response;
    });

    return { data: adjustment };
  }

  async getPayrollPeriods(
    context: RequestContext,
  ): Promise<
    CollectionResponse<PayrollPeriodResponse>
  > {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const periods = await this.prisma.payrollPeriod.findMany({
      where: { tenantId, factoryId },
      orderBy: { month: 'desc' },
      select: {
        id: true,
        month: true,
        status: true,
        totalWorkedAmount: true,
        totalBonusAmount: true,
        totalPenaltyAmount: true,
        totalAdvanceAmount: true,
        totalFinalAmount: true,
        totalPaidAmount: true,
        totalRemainingAmount: true,
        calculatedAt: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      data: periods.map((period) => ({
        ...period,
        totalWorkedAmount: period.totalWorkedAmount.toString(),
        totalBonusAmount: period.totalBonusAmount.toString(),
        totalPenaltyAmount: period.totalPenaltyAmount.toString(),
        totalAdvanceAmount: period.totalAdvanceAmount.toString(),
        totalFinalAmount: period.totalFinalAmount.toString(),
        totalPaidAmount: period.totalPaidAmount.toString(),
        totalRemainingAmount: period.totalRemainingAmount.toString(),
      })),
    };
  }

  async createPayrollPeriod(
    context: RequestContext,
    dto: CreatePayrollPeriodDto,
  ): Promise<SingleResponse<PayrollPeriodResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const month = this.parsePayrollMonth(dto.month);

    const period = await this.prisma.$transaction(async (tx) => {
      const existingPeriod = await tx.payrollPeriod.findFirst({
        where: { tenantId, factoryId, month },
        select: { id: true },
      });

      if (existingPeriod) {
        throw new ConflictException('Payroll period already exists for this month.');
      }

      const createdPeriod = await tx.payrollPeriod.create({
        data: {
          tenantId,
          factoryId,
          month,
          status: PayrollPeriodStatus.DRAFT,
          totalWorkedAmount: new Prisma.Decimal(0),
          totalBonusAmount: new Prisma.Decimal(0),
          totalPenaltyAmount: new Prisma.Decimal(0),
          totalAdvanceAmount: new Prisma.Decimal(0),
          totalFinalAmount: new Prisma.Decimal(0),
          totalPaidAmount: new Prisma.Decimal(0),
          totalRemainingAmount: new Prisma.Decimal(0),
        },
        select: payrollPeriodSelect,
      });
      const response = this.mapPayrollPeriod(createdPeriod);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'PAYROLL_PERIOD_CREATED',
        entityType: 'PayrollPeriod',
        entityId: createdPeriod.id,
        after: response,
      });

      return response;
    });

    return { data: period };
  }

  async calculatePayrollPeriod(
    context: RequestContext,
    payrollPeriodId: string,
  ): Promise<SingleResponse<PayrollPeriodResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);

    const period = await this.prisma.$transaction(async (tx) => {
      const existingPeriod = await tx.payrollPeriod.findFirst({
        where: { id: payrollPeriodId, tenantId, factoryId },
        select: payrollPeriodSelect,
      });

      if (!existingPeriod) {
        throw new NotFoundException('Payroll period not found.');
      }

      if (
        existingPeriod.status !== PayrollPeriodStatus.DRAFT &&
        existingPeriod.status !== PayrollPeriodStatus.CALCULATED
      ) {
        throw new ConflictException(
          'Payroll can be recalculated only while DRAFT or CALCULATED.',
        );
      }

      const { start, end } = this.getMonthRange(existingPeriod.month);

      const [activities, adjustments] = await Promise.all([
        tx.workerActivity.findMany({
          where: {
            tenantId,
            factoryId,
            activityDate: { gte: start, lt: end },
          },
          select: {
            id: true,
            employeeId: true,
            quantity: true,
            salaryRateAmount: true,
            activityDate: true,
            productionStage: { select: { id: true, name: true } },
            productVariant: {
              select: {
                id: true,
                product: { select: { name: true } },
                color: { select: { name: true } },
                material: { select: { name: true } },
                season: { select: { name: true } },
              },
            },
          },
        }),
        tx.employeeAdjustment.findMany({
          where: {
            tenantId,
            factoryId,
            cancelledAt: null,
            requestedAt: { gte: start, lt: end },
            status: { in: PAYROLL_APPLICABLE_ADJUSTMENT_STATUSES },
            OR: [{ payrollPeriodId: null }, { payrollPeriodId }],
          },
          select: {
            id: true,
            employeeId: true,
            type: true,
            amount: true,
            reason: true,
            status: true,
            requestedAt: true,
          },
        }),
      ]);

      const employeeIds = [
        ...new Set([
          ...activities.map((activity) => activity.employeeId),
          ...adjustments.map((adjustment) => adjustment.employeeId),
        ]),
      ];
      const employees = await tx.employee.findMany({
        where: { id: { in: employeeIds }, tenantId, factoryId },
        select: { id: true, name: true, status: true },
      });
      const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));

      await tx.payrollItem.deleteMany({
        where: { tenantId, factoryId, payrollPeriodId },
      });

      const itemInputs: Prisma.PayrollItemCreateManyInput[] = [];
      let totalWorkedAmount = new Prisma.Decimal(0);
      let totalBonusAmount = new Prisma.Decimal(0);
      let totalPenaltyAmount = new Prisma.Decimal(0);
      let totalAdvanceAmount = new Prisma.Decimal(0);
      let totalFinalAmount = new Prisma.Decimal(0);

      for (const employeeId of employeeIds) {
        const employee = employeeMap.get(employeeId);

        if (!employee) {
          continue;
        }

        const employeeActivities = activities.filter(
          (activity) => activity.employeeId === employeeId,
        );
        const employeeAdjustments = adjustments.filter(
          (adjustment) => adjustment.employeeId === employeeId,
        );

        const workedAmount = this.sumDecimal(
          employeeActivities.map((activity) =>
            activity.salaryRateAmount.mul(activity.quantity),
          ),
        );
        const bonusAmount = this.sumDecimal(
          employeeAdjustments
            .filter((adjustment) => adjustment.type === EmployeeAdjustmentType.BONUS)
            .map((adjustment) => adjustment.amount),
        );
        const penaltyAmount = this.sumDecimal(
          employeeAdjustments
            .filter((adjustment) => adjustment.type === EmployeeAdjustmentType.PENALTY)
            .map((adjustment) => adjustment.amount),
        );
        const advanceAmount = this.sumDecimal(
          employeeAdjustments
            .filter((adjustment) => adjustment.type === EmployeeAdjustmentType.ADVANCE)
            .map((adjustment) => adjustment.amount),
        );
        const rawFinalAmount = workedAmount
          .plus(bonusAmount)
          .minus(penaltyAmount)
          .minus(advanceAmount);
        const finalAmount = rawFinalAmount.lt(0)
          ? new Prisma.Decimal(0)
          : rawFinalAmount;

        totalWorkedAmount = totalWorkedAmount.plus(workedAmount);
        totalBonusAmount = totalBonusAmount.plus(bonusAmount);
        totalPenaltyAmount = totalPenaltyAmount.plus(penaltyAmount);
        totalAdvanceAmount = totalAdvanceAmount.plus(advanceAmount);
        totalFinalAmount = totalFinalAmount.plus(finalAmount);

        itemInputs.push({
          tenantId,
          factoryId,
          payrollPeriodId,
          employeeId,
          workedAmount,
          bonusAmount,
          penaltyAmount,
          advanceAmount,
          finalAmount,
          paidAmount: new Prisma.Decimal(0),
          remainingAmount: finalAmount,
          status:
            finalAmount.eq(0) ? PayrollItemStatus.PAID : PayrollItemStatus.CALCULATED,
          calculationSnapshot: {
            rawFinalAmount: rawFinalAmount.toString(),
            activities: employeeActivities.map((activity) => ({
              id: activity.id,
              quantity: activity.quantity,
              salaryRateAmount: activity.salaryRateAmount.toString(),
              amount: activity.salaryRateAmount.mul(activity.quantity).toString(),
              activityDate: activity.activityDate.toISOString(),
              stageName: activity.productionStage.name,
              product: {
                id: activity.productVariant.id,
                model: activity.productVariant.product.name,
                color: activity.productVariant.color.name,
                material: activity.productVariant.material.name,
                season: activity.productVariant.season.name,
              },
            })),
            adjustments: employeeAdjustments.map((adjustment) => ({
              id: adjustment.id,
              type: adjustment.type,
              amount: adjustment.amount.toString(),
              reason: adjustment.reason,
              status: adjustment.status,
              requestedAt: adjustment.requestedAt.toISOString(),
            })),
          } as Prisma.InputJsonValue,
        });
      }

      if (itemInputs.length > 0) {
        await tx.payrollItem.createMany({ data: itemInputs });
      }

      if (adjustments.length > 0) {
        await tx.employeeAdjustment.updateMany({
          where: { id: { in: adjustments.map((adjustment) => adjustment.id) }, tenantId },
          data: {
            payrollPeriodId,
            status: EmployeeAdjustmentStatus.APPLIED,
          },
        });
      }

      const updatedPeriod = await tx.payrollPeriod.update({
        where: { id_tenantId_factoryId: { id: payrollPeriodId, tenantId, factoryId } },
        data: {
          status: PayrollPeriodStatus.CALCULATED,
          totalWorkedAmount,
          totalBonusAmount,
          totalPenaltyAmount,
          totalAdvanceAmount,
          totalFinalAmount,
          totalPaidAmount: new Prisma.Decimal(0),
          totalRemainingAmount: totalFinalAmount,
          calculatedAt: new Date(),
        },
        select: payrollPeriodSelect,
      });
      const response = this.mapPayrollPeriod(updatedPeriod);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'PAYROLL_PERIOD_CALCULATED',
        entityType: 'PayrollPeriod',
        entityId: payrollPeriodId,
        before: this.mapPayrollPeriod(existingPeriod),
        after: response,
        metadata: {
          activityCount: activities.length,
          adjustmentCount: adjustments.length,
          itemCount: itemInputs.length,
        },
      });

      return response;
    });

    return { data: period };
  }

  async closePayrollPeriod(
    context: RequestContext,
    payrollPeriodId: string,
  ): Promise<SingleResponse<PayrollPeriodResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);

    const period = await this.prisma.$transaction(async (tx) => {
      const existingPeriod = await tx.payrollPeriod.findFirst({
        where: { id: payrollPeriodId, tenantId, factoryId },
        select: payrollPeriodSelect,
      });

      if (!existingPeriod) {
        throw new NotFoundException('Payroll period not found.');
      }

      if (existingPeriod.status === PayrollPeriodStatus.CLOSED) {
        throw new ConflictException('Payroll period is already closed.');
      }

      if (
        existingPeriod.status === PayrollPeriodStatus.DRAFT ||
        existingPeriod.status === PayrollPeriodStatus.PARTIALLY_PAID
      ) {
        throw new ConflictException(
          'Payroll period can be closed only after calculation and final payment review.',
        );
      }

      const updatedPeriod = await tx.payrollPeriod.update({
        where: { id_tenantId_factoryId: { id: payrollPeriodId, tenantId, factoryId } },
        data: {
          status: PayrollPeriodStatus.CLOSED,
          closedAt: new Date(),
        },
        select: payrollPeriodSelect,
      });
      const response = this.mapPayrollPeriod(updatedPeriod);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'PAYROLL_PERIOD_CLOSED',
        entityType: 'PayrollPeriod',
        entityId: payrollPeriodId,
        before: this.mapPayrollPeriod(existingPeriod),
        after: response,
      });

      return response;
    });

    return { data: period };
  }

  async payPayrollPeriod(
    context: RequestContext,
    payrollPeriodId: string,
    dto: PayPayrollPeriodDto,
  ): Promise<SingleResponse<PayrollPaymentResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const amount = this.parsePositiveDecimal(dto.amount, 'Payment amount');

    const payment = await this.prisma.$transaction(async (tx) => {
      const period = await tx.payrollPeriod.findFirst({
        where: { id: payrollPeriodId, tenantId, factoryId },
        select: payrollPeriodSelect,
      });

      if (!period) {
        throw new NotFoundException('Payroll period not found.');
      }

      if (
        period.status !== PayrollPeriodStatus.CALCULATED &&
        period.status !== PayrollPeriodStatus.PARTIALLY_PAID
      ) {
        throw new ConflictException(
          'Payroll payment is allowed only while CALCULATED or PARTIALLY_PAID.',
        );
      }

      const item = await tx.payrollItem.findFirst({
        where: {
          id: dto.payrollItemId,
          tenantId,
          factoryId,
          payrollPeriodId,
        },
        select: payrollItemSelect,
      });

      if (!item) {
        throw new NotFoundException('Payroll item not found.');
      }

      if (amount.gt(item.remainingAmount)) {
        throw new ConflictException('Payment exceeds payroll item remaining amount.');
      }

      const nextPaidAmount = item.paidAmount.plus(amount);
      const nextRemainingAmount = item.remainingAmount.minus(amount);
      const nextItemStatus = nextRemainingAmount.eq(0)
        ? PayrollItemStatus.PAID
        : PayrollItemStatus.PARTIALLY_PAID;

      const createdPayment = await tx.payrollPayment.create({
        data: {
          tenantId,
          payrollItemId: item.id,
          amount,
          method: dto.method,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          paidByUserId: context.userId,
          note: dto.note?.trim() || null,
        },
        select: payrollPaymentSelect,
      });

      await tx.payrollItem.update({
        where: { id_tenantId: { id: item.id, tenantId } },
        data: {
          paidAmount: nextPaidAmount,
          remainingAmount: nextRemainingAmount,
          status: nextItemStatus,
        },
      });

      const periodTotals = await tx.payrollItem.aggregate({
        where: { tenantId, factoryId, payrollPeriodId },
        _sum: { paidAmount: true, remainingAmount: true },
      });
      const totalPaidAmount = this.decimalOrZero(periodTotals._sum.paidAmount);
      const totalRemainingAmount = this.decimalOrZero(
        periodTotals._sum.remainingAmount,
      );
      const nextPeriodStatus = totalRemainingAmount.eq(0)
        ? PayrollPeriodStatus.PAID
        : PayrollPeriodStatus.PARTIALLY_PAID;

      const updatedPeriod = await tx.payrollPeriod.update({
        where: { id_tenantId_factoryId: { id: payrollPeriodId, tenantId, factoryId } },
        data: {
          totalPaidAmount,
          totalRemainingAmount,
          status: nextPeriodStatus,
        },
        select: payrollPeriodSelect,
      });

      const response = this.mapPayrollPayment(createdPayment);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'PAYROLL_PAYMENT_CREATED',
        entityType: 'PayrollPayment',
        entityId: createdPayment.id,
        after: response,
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'PAYROLL_PERIOD_PAYMENT_STATUS_UPDATED',
        entityType: 'PayrollPeriod',
        entityId: payrollPeriodId,
        before: this.mapPayrollPeriod(period),
        after: this.mapPayrollPeriod(updatedPeriod),
        metadata: {
          payrollPaymentId: createdPayment.id,
          payrollItemId: item.id,
          amount: amount.toString(),
        },
      });

      return response;
    });

    return { data: payment };
  }

  async getPayrollPeriodItems(
    context: RequestContext,
    payrollPeriodId: string,
  ): Promise<CollectionResponse<PayrollItemResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const items = await this.prisma.payrollItem.findMany({
      where: {
        tenantId,
        factoryId,
        payrollPeriodId,
        // This relation condition prevents an item from another tenant/factory
        // being returned if an identifier is supplied directly.
        payrollPeriod: { tenantId, factoryId },
      },
      orderBy: { employee: { name: 'asc' } },
      select: {
        id: true,
        workedAmount: true,
        bonusAmount: true,
        penaltyAmount: true,
        advanceAmount: true,
        finalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        status: true,
        calculationSnapshot: true,
        createdAt: true,
        updatedAt: true,
        employee: { select: { id: true, name: true, status: true } },
      },
    });

    return {
      data: items.map((item) => ({
        ...item,
        workedAmount: item.workedAmount.toString(),
        bonusAmount: item.bonusAmount.toString(),
        penaltyAmount: item.penaltyAmount.toString(),
        advanceAmount: item.advanceAmount.toString(),
        finalAmount: item.finalAmount.toString(),
        paidAmount: item.paidAmount.toString(),
        remainingAmount: item.remainingAmount.toString(),
      })),
    };
  }

  private async findRecentExpenses(
    tenantId: string,
    factoryId: string,
    take: number,
  ): Promise<ExpenseResponse[]> {
    const expenses = await this.prisma.expense.findMany({
      where: { tenantId, factoryId },
      orderBy: { requestedAt: 'desc' },
      take,
      select: {
        id: true,
        amount: true,
        reason: true,
        status: true,
        requestedAt: true,
        approvedAt: true,
        paidAt: true,
        cancelledAt: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } },
      },
    });

    return expenses.map((expense) => ({
      ...expense,
      amount: expense.amount.toString(),
    }));
  }

  private async findRecentAdvances(
    tenantId: string,
    factoryId: string,
    take: number,
  ): Promise<AdvanceResponse[]> {
    const advances = await this.prisma.employeeAdjustment.findMany({
      where: {
        tenantId,
        factoryId,
        type: EmployeeAdjustmentType.ADVANCE,
      },
      orderBy: { requestedAt: 'desc' },
      take,
      select: {
        id: true,
        amount: true,
        reason: true,
        status: true,
        requestedAt: true,
        approvedAt: true,
        paidAt: true,
        cancelledAt: true,
        createdAt: true,
        updatedAt: true,
        employee: { select: { id: true, name: true, status: true } },
        payrollPeriod: { select: { id: true, month: true, status: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } },
      },
    });

    return advances.map((advance) => ({
      ...advance,
      amount: advance.amount.toString(),
    }));
  }

  private async findRecentPayrollPeriods(
    tenantId: string,
    factoryId: string,
    take: number,
  ): Promise<PayrollPeriodResponse[]> {
    const periods = await this.prisma.payrollPeriod.findMany({
      where: { tenantId, factoryId },
      orderBy: { month: 'desc' },
      take,
      select: {
        id: true,
        month: true,
        status: true,
        totalWorkedAmount: true,
        totalBonusAmount: true,
        totalPenaltyAmount: true,
        totalAdvanceAmount: true,
        totalFinalAmount: true,
        totalPaidAmount: true,
        totalRemainingAmount: true,
        calculatedAt: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return periods.map((period) => ({
      ...this.mapPayrollPeriod(period),
    }));
  }

  private mapAdjustment(
    adjustment: Prisma.EmployeeAdjustmentGetPayload<{ select: typeof adjustmentSelect }>,
  ): AdvanceResponse {
    return {
      ...adjustment,
      amount: adjustment.amount.toString(),
    };
  }

  private mapPayrollPeriod(
    period: Prisma.PayrollPeriodGetPayload<{ select: typeof payrollPeriodSelect }>,
  ): PayrollPeriodResponse {
    return {
      ...period,
      totalWorkedAmount: period.totalWorkedAmount.toString(),
      totalBonusAmount: period.totalBonusAmount.toString(),
      totalPenaltyAmount: period.totalPenaltyAmount.toString(),
      totalAdvanceAmount: period.totalAdvanceAmount.toString(),
      totalFinalAmount: period.totalFinalAmount.toString(),
      totalPaidAmount: period.totalPaidAmount.toString(),
      totalRemainingAmount: period.totalRemainingAmount.toString(),
    };
  }

  private mapPayrollPayment(
    payment: Prisma.PayrollPaymentGetPayload<{ select: typeof payrollPaymentSelect }>,
  ): PayrollPaymentResponse {
    return {
      ...payment,
      amount: payment.amount.toString(),
    };
  }

  private sumDecimal(values: Prisma.Decimal[]): Prisma.Decimal {
    return values.reduce(
      (total, value) => total.plus(value),
      new Prisma.Decimal(0),
    );
  }

  private parsePositiveDecimal(value: string, label: string): Prisma.Decimal {
    const decimal = new Prisma.Decimal(value);

    if (!decimal.isFinite() || decimal.lte(0)) {
      throw new BadRequestException(`${label} must be positive.`);
    }

    return decimal;
  }

  private parsePayrollMonth(value: string): Date {
    const trimmed = value.trim();
    const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(trimmed);

    if (!match) {
      throw new BadRequestException('Month must be in YYYY-MM or YYYY-MM-DD format.');
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;

    if (monthIndex < 0 || monthIndex > 11) {
      throw new BadRequestException('Month value is invalid.');
    }

    return new Date(Date.UTC(year, monthIndex, 1));
  }

  private getMonthRange(month: Date): { start: Date; end: Date } {
    const year = month.getUTCFullYear();
    const monthIndex = month.getUTCMonth();

    return {
      start: new Date(Date.UTC(year, monthIndex, 1)),
      end: new Date(Date.UTC(year, monthIndex + 1, 1)),
    };
  }

  private decimalOrZero(value: Prisma.Decimal | null): Prisma.Decimal {
    return value ?? new Prisma.Decimal(0);
  }

  private getCurrentTashkentMonthRangeUtc(): {
    startUtc: Date;
    endUtc: Date;
  } {
    const now = new Date();
    const tashkentNow = new Date(
      now.getTime() + TASHKENT_UTC_OFFSET_HOURS * 60 * 60 * 1000,
    );
    const year = tashkentNow.getUTCFullYear();
    const month = tashkentNow.getUTCMonth();

    return {
      startUtc: this.tashkentLocalDateToUtc(year, month, 1),
      endUtc: this.tashkentLocalDateToUtc(year, month + 1, 1),
    };
  }

  private tashkentLocalDateToUtc(
    year: number,
    month: number,
    day: number,
  ): Date {
    return new Date(
      Date.UTC(year, month, day) -
        TASHKENT_UTC_OFFSET_HOURS * 60 * 60 * 1000,
    );
  }
}

const adjustmentSelect = {
  id: true,
  amount: true,
  reason: true,
  status: true,
  requestedAt: true,
  approvedAt: true,
  paidAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  employee: { select: { id: true, name: true, status: true } },
  payrollPeriod: { select: { id: true, month: true, status: true } },
  requestedBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  paidBy: { select: { id: true, name: true } },
} satisfies Prisma.EmployeeAdjustmentSelect;

const payrollPeriodSelect = {
  id: true,
  month: true,
  status: true,
  totalWorkedAmount: true,
  totalBonusAmount: true,
  totalPenaltyAmount: true,
  totalAdvanceAmount: true,
  totalFinalAmount: true,
  totalPaidAmount: true,
  totalRemainingAmount: true,
  calculatedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PayrollPeriodSelect;

const payrollItemSelect = {
  id: true,
  workedAmount: true,
  bonusAmount: true,
  penaltyAmount: true,
  advanceAmount: true,
  finalAmount: true,
  paidAmount: true,
  remainingAmount: true,
  status: true,
  calculationSnapshot: true,
  createdAt: true,
  updatedAt: true,
  employee: { select: { id: true, name: true, status: true } },
} satisfies Prisma.PayrollItemSelect;

const payrollPaymentSelect = {
  id: true,
  amount: true,
  method: true,
  paidAt: true,
  note: true,
  createdAt: true,
  payrollItem: {
    select: {
      id: true,
      employee: { select: { id: true, name: true, status: true } },
    },
  },
  paidBy: { select: { id: true, name: true } },
} satisfies Prisma.PayrollPaymentSelect;
