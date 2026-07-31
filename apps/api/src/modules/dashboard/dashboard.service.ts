import { Injectable } from '@nestjs/common';
import {
  EmployeeAdjustmentStatus,
  EmployeeAdjustmentType,
  EmployeeStatus,
  ExpenseStatus,
  PayrollPeriodStatus,
  Prisma,
  SalesOrderStatus,
} from '../../prisma/client';
import { DevContextService } from '../../common/dev-context/dev-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import { ProductionService } from '../production/production.service';
import { WarehouseService } from '../warehouse/warehouse.service';
import {
  AttentionPriority,
  ExecutiveAttentionItemResponse,
  ExecutiveRecentActivityResponse,
  ExecutiveSummaryResponse,
  ExecutiveTopClientResponse,
  ExecutiveTopProductResponse,
  FactoryTvAlertResponse,
  FactoryTvSummaryResponse,
  HealthStatus,
} from './dashboard.types';

const TASHKENT_UTC_OFFSET_HOURS = 5;
const TOP_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 5;
const ACTIVE_ORDER_STATUSES: SalesOrderStatus[] = [
  SalesOrderStatus.CONFIRMED,
  SalesOrderStatus.WAITING_PRODUCTION,
  SalesOrderStatus.READY,
];
const COMMERCIAL_ORDER_STATUSES: SalesOrderStatus[] = [
  SalesOrderStatus.CONFIRMED,
  SalesOrderStatus.WAITING_PRODUCTION,
  SalesOrderStatus.READY,
  SalesOrderStatus.DELIVERED,
  SalesOrderStatus.CLOSED,
];
const PENDING_ADVANCE_STATUSES: EmployeeAdjustmentStatus[] = [
  EmployeeAdjustmentStatus.REQUESTED,
  EmployeeAdjustmentStatus.APPROVED,
];
const OPEN_PAYROLL_STATUSES: PayrollPeriodStatus[] = [
  PayrollPeriodStatus.DRAFT,
  PayrollPeriodStatus.CALCULATED,
  PayrollPeriodStatus.PARTIALLY_PAID,
  PayrollPeriodStatus.PAID,
];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devContext: DevContextService,
    private readonly productionService: ProductionService,
    private readonly warehouseService: WarehouseService,
  ) {}

  async getExecutiveSummary(context: RequestContext): Promise<ExecutiveSummaryResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const { startUtc, endUtc } = this.getCurrentTashkentMonthRangeUtc();

    const [
      warehouseSummary,
      monthlySalesAggregate,
      monthlyExpensesAggregate,
      activeEmployees,
      activeOrders,
      totalProducts,
      salesOrders,
      supplierPurchases,
      maxStageInventory,
      pendingExpensesAggregate,
      pendingExpensesCount,
      pendingAdvancesAggregate,
      pendingAdvancesCount,
      openPayrollPeriods,
      recentOrders,
      recentExpenses,
    ] = await Promise.all([
      this.warehouseService.getStockSummary(context),
      this.prisma.salesOrder.aggregate({
        where: {
          tenantId,
          factoryId,
          status: { in: COMMERCIAL_ORDER_STATUSES },
          createdAt: { gte: startUtc, lt: endUtc },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          tenantId,
          factoryId,
          status: ExpenseStatus.PAID,
          paidAt: { gte: startUtc, lt: endUtc },
        },
        _sum: { amount: true },
      }),
      this.prisma.employee.count({
        where: {
          tenantId,
          factoryId,
          status: EmployeeStatus.ACTIVE,
          deletedAt: null,
        },
      }),
      this.prisma.salesOrder.count({
        where: {
          tenantId,
          factoryId,
          status: { in: ACTIVE_ORDER_STATUSES },
        },
      }),
      this.prisma.product.count({
        where: { tenantId, deletedAt: null },
      }),
      this.findCommercialSalesOrders(tenantId, factoryId),
      this.findOpenSupplierPurchases(tenantId, factoryId),
      this.prisma.stageInventory.aggregate({
        where: { tenantId, factoryId },
        _max: { quantity: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          tenantId,
          factoryId,
          status: ExpenseStatus.REQUESTED,
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.count({
        where: {
          tenantId,
          factoryId,
          status: ExpenseStatus.REQUESTED,
        },
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
      this.prisma.employeeAdjustment.count({
        where: {
          tenantId,
          factoryId,
          type: EmployeeAdjustmentType.ADVANCE,
          status: { in: PENDING_ADVANCE_STATUSES },
        },
      }),
      this.prisma.payrollPeriod.count({
        where: {
          tenantId,
          factoryId,
          status: { in: OPEN_PAYROLL_STATUSES },
        },
      }),
      this.findRecentOrders(tenantId, factoryId),
      this.findRecentExpenses(tenantId, factoryId),
    ]);

    const monthlySales = this.decimalOrZero(
      monthlySalesAggregate._sum.totalAmount,
    );
    const monthlyExpenses = this.decimalOrZero(
      monthlyExpensesAggregate._sum.amount,
    );
    const pendingExpenses = this.decimalOrZero(
      pendingExpensesAggregate._sum.amount,
    );
    const pendingAdvances = this.decimalOrZero(
      pendingAdvancesAggregate._sum.amount,
    );
    const totalClientDebt = this.calculateClientDebt(salesOrders);
    const totalSupplierDebt = this.calculateSupplierDebt(supplierPurchases);
    const topClients = this.buildTopClients(salesOrders);
    const topProducts = this.buildTopProducts(salesOrders);
    const lowStockMaterialCount = Number(
      warehouseSummary.data.kpis.lowStockMaterialCount,
    );
    const attentionItems = this.buildAttentionItems({
      lowStockMaterialCount,
      pendingExpenses,
      pendingExpensesCount,
      pendingAdvances,
      pendingAdvancesCount,
      openPayrollPeriods,
    });

    return {
      data: {
        kpis: {
          monthlySales: monthlySales.toString(),
          monthlyExpenses: monthlyExpenses.toString(),
          totalClientDebt: totalClientDebt.toString(),
          totalSupplierDebt: totalSupplierDebt.toString(),
          activeEmployees: activeEmployees.toString(),
          activeOrders: activeOrders.toString(),
          totalProducts: totalProducts.toString(),
          lowStockMaterials: warehouseSummary.data.kpis.lowStockMaterialCount,
        },
        businessHealth: {
          production: this.productionHealth(maxStageInventory._max.quantity),
          warehouse: this.warehouseHealth(lowStockMaterialCount),
          sales: this.moneyHealth(totalClientDebt),
          finance: this.financeHealth({
            pendingExpenses,
            pendingAdvances,
            openPayrollPeriods,
            totalSupplierDebt,
          }),
        },
        topProducts,
        topClients,
        attentionItems,
        recentActivity: this.buildRecentActivity(recentOrders, recentExpenses),
      },
    };
  }

  async getFactoryTvSummary(): Promise<FactoryTvSummaryResponse> {
    const { tenantId, factoryId } = await this.devContext.getFactoryContext();
    const publicTvContext = this.buildPublicTvContext(tenantId, factoryId);
    const [factory, operationsSummary, warehouseSummary] = await Promise.all([
      this.prisma.factory.findFirstOrThrow({
        where: { id: factoryId, tenantId, deletedAt: null },
        select: { name: true },
      }),
      this.productionService.getOperationsSummary(publicTvContext),
      this.warehouseService.getStockSummary(publicTvContext),
    ]);

    const lowStockCount = Number(
      warehouseSummary.data.kpis.lowStockMaterialCount,
    );
    const alerts = this.buildFactoryTvAlerts({
      bottlenecks: operationsSummary.data.bottlenecks,
      lowStockMaterialCount: lowStockCount,
    });

    return {
      data: {
        factoryName: factory.name,
        currentDateLabel: this.formatTashkentDateTime(new Date()),
        shiftLabel: 'Bugungi smena',
        kpis: {
          todayProduction: operationsSummary.data.kpis.todayProduction,
          totalInProgress: operationsSummary.data.kpis.totalInProgress,
          finishedProductQuantity:
            warehouseSummary.data.kpis.finishedProductQuantity,
          activeWorkers: operationsSummary.data.kpis.activeWorkers,
        },
        stageTotals: operationsSummary.data.stageTotals.map((stage) => ({
          stageId: stage.stageId,
          stageName: stage.stageName,
          sortOrder: stage.sortOrder,
          quantity: stage.quantity,
          status: stage.status,
        })),
        topWorkers: operationsSummary.data.topWorkers.map((worker, index) => ({
          rank: String(index + 1),
          employeeId: worker.employeeId,
          employeeName: worker.employeeName,
          stageName: worker.stageName,
          quantity: worker.quantity,
        })),
        alerts,
      },
    };
  }

  private buildPublicTvContext(tenantId: string, factoryId: string): RequestContext {
    return {
      userId: 'public-factory-tv',
      tenantId,
      branchMode: 'SINGLE',
      activeFactoryId: factoryId,
      accessibleFactoryIds: [factoryId],
      roles: [],
      permissions: [],
    };
  }

  private findCommercialSalesOrders(tenantId: string, factoryId: string) {
    return this.prisma.salesOrder.findMany({
      where: {
        tenantId,
        factoryId,
        status: { in: COMMERCIAL_ORDER_STATUSES },
      },
      select: {
        totalAmount: true,
        client: { select: { id: true, name: true } },
        allocations: {
          where: { payment: { reversedAt: null } },
          select: { amount: true },
        },
        items: {
          select: {
            quantity: true,
            totalPrice: true,
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
        },
      },
    });
  }

  private findOpenSupplierPurchases(tenantId: string, factoryId: string) {
    return this.prisma.supplierPurchase.findMany({
      where: {
        tenantId,
        factoryId,
        cancelledAt: null,
      },
      select: {
        totalAmount: true,
        allocations: { select: { amount: true } },
      },
    });
  }

  private findRecentOrders(tenantId: string, factoryId: string) {
    return this.prisma.salesOrder.findMany({
      where: {
        tenantId,
        factoryId,
        status: { in: COMMERCIAL_ORDER_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
      take: RECENT_ACTIVITY_LIMIT,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        client: { select: { name: true } },
      },
    });
  }

  private findRecentExpenses(tenantId: string, factoryId: string) {
    return this.prisma.expense.findMany({
      where: { tenantId, factoryId },
      orderBy: { requestedAt: 'desc' },
      take: RECENT_ACTIVITY_LIMIT,
      select: {
        id: true,
        amount: true,
        status: true,
        reason: true,
        requestedAt: true,
        category: { select: { name: true } },
      },
    });
  }

  private calculateClientDebt(
    orders: Awaited<ReturnType<DashboardService['findCommercialSalesOrders']>>,
  ): Prisma.Decimal {
    return this.sumDecimal(
      orders.map((order) =>
        order.totalAmount.minus(
          this.sumDecimal(order.allocations.map((allocation) => allocation.amount)),
        ),
      ),
    );
  }

  private calculateSupplierDebt(
    purchases: Awaited<ReturnType<DashboardService['findOpenSupplierPurchases']>>,
  ): Prisma.Decimal {
    return this.sumDecimal(
      purchases.map((purchase) =>
        purchase.totalAmount.minus(
          this.sumDecimal(purchase.allocations.map((allocation) => allocation.amount)),
        ),
      ),
    );
  }

  private buildTopClients(
    orders: Awaited<ReturnType<DashboardService['findCommercialSalesOrders']>>,
  ): ExecutiveTopClientResponse[] {
    const clientSummaries = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        totalOrders: Prisma.Decimal;
        totalPaid: Prisma.Decimal;
      }
    >();

    for (const order of orders) {
      const existing = clientSummaries.get(order.client.id) ?? {
        clientId: order.client.id,
        clientName: order.client.name,
        totalOrders: new Prisma.Decimal(0),
        totalPaid: new Prisma.Decimal(0),
      };

      existing.totalOrders = existing.totalOrders.plus(order.totalAmount);
      existing.totalPaid = existing.totalPaid.plus(
        this.sumDecimal(order.allocations.map((allocation) => allocation.amount)),
      );
      clientSummaries.set(order.client.id, existing);
    }

    return [...clientSummaries.values()]
      .sort((left, right) =>
        right.totalOrders.minus(left.totalOrders).toNumber(),
      )
      .slice(0, TOP_LIMIT)
      .map((summary) => {
        const debt = summary.totalOrders.minus(summary.totalPaid);

        return {
          clientId: summary.clientId,
          clientName: summary.clientName,
          totalOrders: summary.totalOrders.toString(),
          totalPaid: summary.totalPaid.toString(),
          debt: debt.toString(),
          debtStatus: this.moneyHealth(debt),
        };
      });
  }

  private buildTopProducts(
    orders: Awaited<ReturnType<DashboardService['findCommercialSalesOrders']>>,
  ): ExecutiveTopProductResponse[] {
    const productSummaries = new Map<
      string,
      {
        productVariantId: string;
        productName: string;
        colorName: string;
        materialName: string;
        seasonName: string;
        quantity: number;
        value: Prisma.Decimal;
      }
    >();

    for (const order of orders) {
      for (const item of order.items) {
        const existing = productSummaries.get(item.productVariant.id) ?? {
          productVariantId: item.productVariant.id,
          productName: item.productVariant.product.name,
          colorName: item.productVariant.color.name,
          materialName: item.productVariant.material.name,
          seasonName: item.productVariant.season.name,
          quantity: 0,
          value: new Prisma.Decimal(0),
        };

        existing.quantity += item.quantity;
        existing.value = existing.value.plus(item.totalPrice);
        productSummaries.set(item.productVariant.id, existing);
      }
    }

    return [...productSummaries.values()]
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, TOP_LIMIT)
      .map((summary) => ({
        ...summary,
        quantity: summary.quantity.toString(),
        value: summary.value.toString(),
      }));
  }

  private buildAttentionItems(input: {
    lowStockMaterialCount: number;
    pendingExpenses: Prisma.Decimal;
    pendingExpensesCount: number;
    pendingAdvances: Prisma.Decimal;
    pendingAdvancesCount: number;
    openPayrollPeriods: number;
  }): ExecutiveAttentionItemResponse[] {
    const items: ExecutiveAttentionItemResponse[] = [];

    if (input.lowStockMaterialCount > 0) {
      items.push({
        id: 'low-stock-materials',
        type: 'LOW_STOCK',
        title: 'Low stock materiallar',
        description: `${input.lowStockMaterialCount} ta material minimal threshold’dan past.`,
        priority: input.lowStockMaterialCount >= 3 ? 'HIGH' : 'MEDIUM',
      });
    }

    if (input.pendingExpensesCount > 0) {
      items.push({
        id: 'pending-expenses',
        type: 'PENDING_EXPENSES',
        title: 'Tasdiqlanishi kutilayotgan xarajatlar',
        description: `${input.pendingExpensesCount} ta xarajat so‘rovi, jami ${input.pendingExpenses.toString()} so‘m.`,
        priority: 'MEDIUM',
      });
    }

    if (input.pendingAdvancesCount > 0) {
      items.push({
        id: 'pending-advances',
        type: 'PENDING_ADVANCES',
        title: 'Kutilayotgan avanslar',
        description: `${input.pendingAdvancesCount} ta avans, jami ${input.pendingAdvances.toString()} so‘m.`,
        priority: 'MEDIUM',
      });
    }

    if (input.openPayrollPeriods > 0) {
      items.push({
        id: 'open-payroll-periods',
        type: 'OPEN_PAYROLL',
        title: 'Ochiq payroll davrlari',
        description: `${input.openPayrollPeriods} ta payroll davri hali yopilmagan.`,
        priority: 'LOW',
      });
    }

    return items;
  }

  private buildFactoryTvAlerts(input: {
    bottlenecks: Array<{
      stageId: string;
      stageName: string;
      quantity: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH';
    }>;
    lowStockMaterialCount: number;
  }): FactoryTvAlertResponse[] {
    const alerts: FactoryTvAlertResponse[] = [];

    if (input.lowStockMaterialCount > 0) {
      alerts.push({
        id: 'tv-low-stock-materials',
        title: 'Xomashyo ogohlantirishi',
        description: `${input.lowStockMaterialCount} ta material minimal threshold’dan past.`,
        tone: input.lowStockMaterialCount >= 3 ? 'CRITICAL' : 'WARNING',
      });
    }

    for (const bottleneck of input.bottlenecks.slice(0, 3)) {
      alerts.push({
        id: `tv-bottleneck-${bottleneck.stageId}`,
        title: 'Bottleneck ogohlantirishi',
        description: `${bottleneck.stageName} bosqichida ${bottleneck.quantity} dona mahsulot bor.`,
        tone: bottleneck.priority === 'HIGH' ? 'CRITICAL' : 'WARNING',
      });
    }

    return alerts;
  }

  private buildRecentActivity(
    orders: Awaited<ReturnType<DashboardService['findRecentOrders']>>,
    expenses: Awaited<ReturnType<DashboardService['findRecentExpenses']>>,
  ): ExecutiveRecentActivityResponse[] {
    return [
      ...orders.map((order) => ({
        id: order.id,
        type: 'ORDER' as const,
        title: `Buyurtma ${order.orderNumber}`,
        description: `${order.client.name} · ${order.status} · ${order.totalAmount.toString()} so‘m`,
        occurredAt: order.createdAt,
      })),
      ...expenses.map((expense) => ({
        id: expense.id,
        type: 'EXPENSE' as const,
        title: expense.category.name,
        description: `${expense.status} · ${expense.amount.toString()} so‘m · ${expense.reason}`,
        occurredAt: expense.requestedAt,
      })),
    ]
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
      .slice(0, RECENT_ACTIVITY_LIMIT);
  }

  private productionHealth(maxStageQuantity: number | null): HealthStatus {
    if (!maxStageQuantity) {
      return 'GOOD';
    }

    if (maxStageQuantity >= 1000) {
      return 'CRITICAL';
    }

    if (maxStageQuantity >= 500) {
      return 'WARNING';
    }

    return 'GOOD';
  }

  private warehouseHealth(lowStockMaterialCount: number): HealthStatus {
    if (lowStockMaterialCount >= 3) {
      return 'CRITICAL';
    }

    if (lowStockMaterialCount > 0) {
      return 'WARNING';
    }

    return 'GOOD';
  }

  private financeHealth(input: {
    pendingExpenses: Prisma.Decimal;
    pendingAdvances: Prisma.Decimal;
    openPayrollPeriods: number;
    totalSupplierDebt: Prisma.Decimal;
  }): HealthStatus {
    if (
      input.pendingExpenses.greaterThan(0) ||
      input.pendingAdvances.greaterThan(0) ||
      input.openPayrollPeriods > 0 ||
      input.totalSupplierDebt.greaterThan(0)
    ) {
      return 'WARNING';
    }

    return 'GOOD';
  }

  private moneyHealth(amount: Prisma.Decimal): HealthStatus {
    return amount.greaterThan(0) ? 'WARNING' : 'GOOD';
  }

  private sumDecimal(values: Prisma.Decimal[]): Prisma.Decimal {
    return values.reduce(
      (total, value) => total.plus(value),
      new Prisma.Decimal(0),
    );
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

  private formatTashkentDateTime(date: Date): string {
    return new Intl.DateTimeFormat('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
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
