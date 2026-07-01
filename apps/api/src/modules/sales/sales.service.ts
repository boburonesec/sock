import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentStatus,
  Prisma,
  SalesOrderStatus,
  StockMovementItemType,
  StockMovementType,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import {
  ClientDto,
  CreateClientPaymentDto,
  CreateSalesOrderDto,
  ReverseClientPaymentDto,
} from './sales.dto';
import {
  ClientDebtResponse,
  ClientPaymentResponse,
  ClientResponse,
  CollectionResponse,
  SalesOrderResponse,
  SalesSummaryResponse,
} from './sales.types';

const RECENT_PAYMENT_LIMIT = 50;
const SUMMARY_RECENT_ORDER_LIMIT = 5;
const SUMMARY_TOP_CLIENT_LIMIT = 5;
const TASHKENT_UTC_OFFSET_HOURS = 5;

// Draft and cancelled orders do not create a receivable. This mirrors the
// approved domain rule that debt is derived from confirmed commercial orders.
const DEBT_ORDER_STATUSES: SalesOrderStatus[] = [
  SalesOrderStatus.CONFIRMED,
  SalesOrderStatus.WAITING_PRODUCTION,
  SalesOrderStatus.READY,
  SalesOrderStatus.DELIVERED,
  SalesOrderStatus.CLOSED,
];

const ACTIVE_ORDER_STATUSES: SalesOrderStatus[] = [
  SalesOrderStatus.CONFIRMED,
  SalesOrderStatus.WAITING_PRODUCTION,
  SalesOrderStatus.READY,
];

const NON_DELIVERABLE_ORDER_STATUSES: SalesOrderStatus[] = [
  SalesOrderStatus.DRAFT,
  SalesOrderStatus.CANCELLED,
  SalesOrderStatus.DELIVERED,
  SalesOrderStatus.CLOSED,
];

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getClients(context: RequestContext): Promise<CollectionResponse<ClientResponse>> {
    const tenantId = context.tenantId;
    const clients = await this.prisma.client.findMany({
      where: { tenantId, status: 'ACTIVE', deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        notes: true,
        status: true,
      },
    });

    return { data: clients };
  }

  async createClient(
    context: RequestContext,
    dto: ClientDto,
  ): Promise<{ data: ClientResponse }> {
    const tenantId = context.tenantId;

    const client = await this.prisma.$transaction(async (tx) => {
      const createdClient = await tx.client.create({
        data: {
          tenantId,
          name: dto.name,
          phone: dto.phone ?? null,
          address: dto.address ?? null,
          notes: dto.notes ?? null,
          status: 'ACTIVE',
        },
        select: clientSelect,
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId: null,
        userId: context.userId,
        action: 'CLIENT_CREATED',
        entityType: 'Client',
        entityId: createdClient.id,
        after: createdClient,
      });

      return createdClient;
    });

    return { data: client };
  }

  async updateClient(
    context: RequestContext,
    id: string,
    dto: ClientDto,
  ): Promise<{ data: ClientResponse }> {
    const tenantId = context.tenantId;

    const client = await this.prisma.$transaction(async (tx) => {
      const existingClient = await tx.client.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null,
        },
        select: clientSelect,
      });

      if (!existingClient) {
        throw new NotFoundException('Client not found.');
      }

      const updatedClient = await tx.client.update({
        where: { id: existingClient.id },
        data: {
          name: dto.name,
          phone: dto.phone ?? null,
          address: dto.address ?? null,
          notes: dto.notes ?? null,
        },
        select: clientSelect,
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId: null,
        userId: context.userId,
        action: 'CLIENT_UPDATED',
        entityType: 'Client',
        entityId: updatedClient.id,
        before: existingClient,
        after: updatedClient,
      });

      return updatedClient;
    });

    return { data: client };
  }

  async archiveClient(
    context: RequestContext,
    id: string,
  ): Promise<{ data: ClientResponse }> {
    const tenantId = context.tenantId;

    const client = await this.prisma.$transaction(async (tx) => {
      const existingClient = await tx.client.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null,
        },
        select: clientSelect,
      });

      if (!existingClient) {
        throw new NotFoundException('Client not found.');
      }

      const archivedClient = await tx.client.update({
        where: { id: existingClient.id },
        data: {
          status: 'INACTIVE',
          deletedAt: new Date(),
        },
        select: clientSelect,
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId: null,
        userId: context.userId,
        action: 'CLIENT_ARCHIVED',
        entityType: 'Client',
        entityId: archivedClient.id,
        before: existingClient,
        after: archivedClient,
      });

      return archivedClient;
    });

    return { data: client };
  }

  async getSummary(context: RequestContext): Promise<SalesSummaryResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const { startUtc, endUtc } = this.getCurrentTashkentMonthRangeUtc();

    const [
      clientCount,
      activeOrderCount,
      monthlySalesAggregate,
      eligibleOrders,
      recentOrders,
    ] = await Promise.all([
      this.prisma.client.count({
        where: { tenantId, status: 'ACTIVE', deletedAt: null },
      }),
      this.prisma.salesOrder.count({
        where: {
          tenantId,
          factoryId,
          status: { in: ACTIVE_ORDER_STATUSES },
        },
      }),
      this.prisma.salesOrder.aggregate({
        where: {
          tenantId,
          factoryId,
          status: { in: DEBT_ORDER_STATUSES },
          createdAt: { gte: startUtc, lt: endUtc },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.salesOrder.findMany({
        where: {
          tenantId,
          factoryId,
          status: { in: DEBT_ORDER_STATUSES },
        },
        select: {
          totalAmount: true,
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true,
              notes: true,
              status: true,
            },
          },
          allocations: {
            where: { payment: { reversedAt: null } },
            select: { amount: true },
          },
        },
      }),
      this.prisma.salesOrder.findMany({
        where: {
          tenantId,
          factoryId,
          status: { in: DEBT_ORDER_STATUSES },
        },
        orderBy: { createdAt: 'desc' },
        take: SUMMARY_RECENT_ORDER_LIMIT,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          paymentStatus: true,
          createdAt: true,
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true,
              notes: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const clientSummaries = new Map<
      string,
      {
        client: ClientResponse;
        totalOrders: Prisma.Decimal;
        totalPaid: Prisma.Decimal;
      }
    >();

    for (const order of eligibleOrders) {
      const existing = clientSummaries.get(order.client.id) ?? {
        client: order.client,
        totalOrders: new Prisma.Decimal(0),
        totalPaid: new Prisma.Decimal(0),
      };

      existing.totalOrders = existing.totalOrders.plus(order.totalAmount);
      existing.totalPaid = existing.totalPaid.plus(
        this.sumDecimal(
          order.allocations.map((allocation) => allocation.amount),
        ),
      );

      clientSummaries.set(order.client.id, existing);
    }

    const topClients = [...clientSummaries.values()]
      .map((summary) => ({
        client: summary.client,
        totalOrders: summary.totalOrders,
        totalPaid: summary.totalPaid,
        debt: summary.totalOrders.minus(summary.totalPaid),
      }))
      .sort((left, right) =>
        right.totalOrders.minus(left.totalOrders).toNumber(),
      )
      .slice(0, SUMMARY_TOP_CLIENT_LIMIT)
      .map((summary) => ({
        client: summary.client,
        totalOrders: summary.totalOrders.toString(),
        totalPaid: summary.totalPaid.toString(),
        debt: summary.debt.toString(),
      }));

    const totalClientDebt = this.sumDecimal(
      [...clientSummaries.values()].map((summary) =>
        summary.totalOrders.minus(summary.totalPaid),
      ),
    );

    return {
      data: {
        kpis: {
          clientCount: clientCount.toString(),
          activeOrderCount: activeOrderCount.toString(),
          monthlySales: (
            monthlySalesAggregate._sum.totalAmount ?? new Prisma.Decimal(0)
          ).toString(),
          totalClientDebt: totalClientDebt.toString(),
        },
        topClients,
        recentOrders: recentOrders.map((order) => ({
          ...order,
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount.toString(),
        })),
      },
    };
  }

  async getOrders(context: RequestContext): Promise<CollectionResponse<SalesOrderResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const orders = await this.prisma.salesOrder.findMany({
      where: { tenantId, factoryId },
      orderBy: { createdAt: 'desc' },
      select: salesOrderSelect,
    });

    return {
      data: orders.map((order) => this.mapSalesOrder(order)),
    };
  }

  async createOrder(
    context: RequestContext,
    dto: CreateSalesOrderDto,
  ): Promise<{ data: SalesOrderResponse }> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const now = new Date();

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const client = await tx.client.findFirst({
        where: {
          id: dto.clientId,
          tenantId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: clientSelect,
      });

      if (!client) {
        throw new NotFoundException('Active client not found.');
      }

      const variantIds = [...new Set(dto.items.map((item) => item.productVariantId))];
      const variants = await tx.productVariant.findMany({
        where: {
          id: { in: variantIds },
          tenantId,
          deletedAt: null,
          product: { deletedAt: null },
        },
        select: {
          id: true,
          productId: true,
        },
      });
      const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

      if (variantMap.size !== variantIds.length) {
        throw new NotFoundException('Active product variant not found.');
      }

      const orderItems: Prisma.SalesOrderItemCreateWithoutOrderInput[] = [];
      let totalAmount = new Prisma.Decimal(0);

      for (const item of dto.items) {
        const variant = variantMap.get(item.productVariantId);

        if (!variant) {
          throw new NotFoundException('Active product variant not found.');
        }

        const unitPrice =
          item.unitPrice != null
            ? this.parsePositiveDecimal(item.unitPrice, 'Unit price')
            : await this.resolveActiveProductPrice(
                tx,
                tenantId,
                variant.id,
                now,
              );
        const totalPrice = unitPrice.mul(item.quantity);

        totalAmount = totalAmount.plus(totalPrice);
        orderItems.push({
          tenant: { connect: { id: tenantId } },
          productVariant: {
            connect: {
              id_tenantId: {
                id: variant.id,
                tenantId,
              },
            },
          },
          quantity: item.quantity,
          unitPrice,
          totalPrice,
        });
      }

      const order = await tx.salesOrder.create({
        data: {
          tenant: { connect: { id: tenantId } },
          factory: {
            connect: {
              id_tenantId: {
                id: factoryId,
                tenantId,
              },
            },
          },
          client: {
            connect: {
              id_tenantId: {
                id: client.id,
                tenantId,
              },
            },
          },
          orderNumber: this.generateOrderNumber(now),
          status: SalesOrderStatus.CONFIRMED,
          deadline: dto.deadline ? new Date(dto.deadline) : null,
          totalAmount,
          paymentStatus: PaymentStatus.UNPAID,
          createdBy: context.userId
            ? {
                connect: {
                  id_tenantId: {
                    id: context.userId,
                    tenantId,
                  },
                },
              }
            : undefined,
          items: { create: orderItems },
        },
        select: salesOrderSelect,
      });

      const response = this.mapSalesOrder(order);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'SALES_ORDER_CREATED',
        entityType: 'SalesOrder',
        entityId: order.id,
        after: response,
        metadata: dto.note ? { note: dto.note } : null,
      });

      return response;
    });

    return { data: createdOrder };
  }

  async deliverOrder(
    context: RequestContext,
    orderId: string,
  ): Promise<{ data: SalesOrderResponse }> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const deliveredOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findFirst({
        where: { id: orderId, tenantId, factoryId },
        select: salesOrderSelect,
      });

      if (!order) {
        throw new NotFoundException('Sales order not found.');
      }

      if (order.paymentStatus !== PaymentStatus.PAID) {
        throw new ConflictException('Only fully paid orders can be delivered in v1.');
      }

      if (NON_DELIVERABLE_ORDER_STATUSES.includes(order.status)) {
        throw new ConflictException(
          `Order with status ${order.status} cannot be delivered.`,
        );
      }

      const finishedProductsZone = await tx.warehouseZone.findFirst({
        where: {
          tenantId,
          name: 'Finished Products',
          warehouse: { tenantId, factoryId, deletedAt: null },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          warehouseId: true,
          warehouse: { select: { id: true, name: true } },
        },
      });

      if (!finishedProductsZone) {
        throw new ConflictException('Finished Products warehouse zone not found.');
      }

      const now = new Date();

      for (const item of order.items) {
        const stock = await tx.stock.findUnique({
          where: {
            tenantId_warehouseId_warehouseZoneId_productVariantId: {
              tenantId,
              warehouseId: finishedProductsZone.warehouseId,
              warehouseZoneId: finishedProductsZone.id,
              productVariantId: item.productVariant.id,
            },
          },
          select: {
            id: true,
            quantity: true,
            productVariantId: true,
            warehouseId: true,
            warehouseZoneId: true,
          },
        });

        if (!stock || stock.quantity < item.quantity) {
          throw new ConflictException(
            `Finished product stock is not enough for ${item.productVariant.product.name}.`,
          );
        }

        const updateResult = await tx.stock.updateMany({
          where: {
            id: stock.id,
            tenantId,
            factoryId,
            quantity: { gte: item.quantity },
          },
          data: {
            quantity: { decrement: item.quantity },
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictException(
            `Finished product stock changed while delivering ${item.productVariant.product.name}.`,
          );
        }

        const afterQuantity = stock.quantity - item.quantity;
        const stockMovement = await tx.stockMovement.create({
          data: {
            tenantId,
            factoryId,
            warehouseId: finishedProductsZone.warehouseId,
            warehouseZoneId: finishedProductsZone.id,
            itemType: StockMovementItemType.PRODUCT,
            movementType: StockMovementType.ISSUE,
            productVariantId: item.productVariant.id,
            quantity: new Prisma.Decimal(item.quantity),
            unit: 'pcs',
            beforeQuantity: new Prisma.Decimal(stock.quantity),
            afterQuantity: new Prisma.Decimal(afterQuantity),
            reason: 'Order delivery',
            note: `Order ${order.orderNumber} delivered`,
            recordedByUserId: context.userId,
            occurredAt: now,
          },
          select: {
            id: true,
            productVariantId: true,
            quantity: true,
            beforeQuantity: true,
            afterQuantity: true,
          },
        });

        await this.auditService.createWithTransaction(tx, {
          tenantId,
          factoryId,
          userId: context.userId,
          action: 'STOCK_DECREASED',
          entityType: 'Stock',
          entityId: stock.id,
          before: {
            quantity: stock.quantity.toString(),
            productVariantId: item.productVariant.id,
            warehouseZoneId: finishedProductsZone.id,
          },
          after: {
            quantity: afterQuantity.toString(),
            productVariantId: item.productVariant.id,
            warehouseZoneId: finishedProductsZone.id,
          },
          metadata: { orderId: order.id, orderNumber: order.orderNumber },
        });

        await this.auditService.createWithTransaction(tx, {
          tenantId,
          factoryId,
          userId: context.userId,
          action: 'STOCK_MOVEMENT_CREATED',
          entityType: 'StockMovement',
          entityId: stockMovement.id,
          after: {
            ...stockMovement,
            quantity: stockMovement.quantity.toString(),
            beforeQuantity: stockMovement.beforeQuantity?.toString() ?? null,
            afterQuantity: stockMovement.afterQuantity?.toString() ?? null,
          },
          metadata: { orderId: order.id, orderNumber: order.orderNumber },
        });
      }

      const updatedOrder = await tx.salesOrder.update({
        where: { id_tenantId: { id: order.id, tenantId } },
        data: { status: SalesOrderStatus.DELIVERED },
        select: salesOrderSelect,
      });
      const response = this.mapSalesOrder(updatedOrder);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'SALES_ORDER_DELIVERED',
        entityType: 'SalesOrder',
        entityId: order.id,
        before: this.mapSalesOrder(order),
        after: response,
      });

      return response;
    });

    return { data: deliveredOrder };
  }

  async returnDelivery(
    context: RequestContext,
    orderId: string,
  ): Promise<{ data: SalesOrderResponse }> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const returnedOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findFirst({
        where: { id: orderId, tenantId, factoryId },
        select: salesOrderSelect,
      });

      if (!order) {
        throw new NotFoundException('Sales order not found.');
      }

      if (order.status !== SalesOrderStatus.DELIVERED) {
        throw new ConflictException(
          'Only delivered orders can be returned in v1.',
        );
      }

      if (order.items.length === 0) {
        throw new ConflictException('Sales order has no items to return.');
      }

      const finishedProductsZone = await tx.warehouseZone.findFirst({
        where: {
          tenantId,
          name: 'Finished Products',
          warehouse: { tenantId, factoryId, deletedAt: null },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          warehouseId: true,
          warehouse: { select: { id: true, name: true } },
        },
      });

      if (!finishedProductsZone) {
        throw new ConflictException('Finished Products warehouse zone not found.');
      }

      const now = new Date();

      for (const item of order.items) {
        const stock = await tx.stock.findUnique({
          where: {
            tenantId_warehouseId_warehouseZoneId_productVariantId: {
              tenantId,
              warehouseId: finishedProductsZone.warehouseId,
              warehouseZoneId: finishedProductsZone.id,
              productVariantId: item.productVariant.id,
            },
          },
          select: {
            id: true,
            quantity: true,
            productVariantId: true,
            warehouseId: true,
            warehouseZoneId: true,
          },
        });
        const beforeQuantity = stock?.quantity ?? 0;
        const afterQuantity = beforeQuantity + item.quantity;
        const stockAfter = await tx.stock.upsert({
          where: {
            tenantId_warehouseId_warehouseZoneId_productVariantId: {
              tenantId,
              warehouseId: finishedProductsZone.warehouseId,
              warehouseZoneId: finishedProductsZone.id,
              productVariantId: item.productVariant.id,
            },
          },
          create: {
            tenantId,
            factoryId,
            warehouseId: finishedProductsZone.warehouseId,
            warehouseZoneId: finishedProductsZone.id,
            productVariantId: item.productVariant.id,
            quantity: item.quantity,
          },
          update: {
            quantity: { increment: item.quantity },
          },
          select: { id: true, quantity: true },
        });
        const stockMovement = await tx.stockMovement.create({
          data: {
            tenantId,
            factoryId,
            warehouseId: finishedProductsZone.warehouseId,
            warehouseZoneId: finishedProductsZone.id,
            itemType: StockMovementItemType.PRODUCT,
            movementType: StockMovementType.RETURN,
            productVariantId: item.productVariant.id,
            quantity: new Prisma.Decimal(item.quantity),
            unit: 'pcs',
            beforeQuantity: new Prisma.Decimal(beforeQuantity),
            afterQuantity: new Prisma.Decimal(stockAfter.quantity),
            reason: 'ORDER_DELIVERY_RETURN',
            note: `Order ${order.orderNumber} delivery returned`,
            recordedByUserId: context.userId,
            occurredAt: now,
          },
          select: {
            id: true,
            productVariantId: true,
            quantity: true,
            beforeQuantity: true,
            afterQuantity: true,
          },
        });

        await this.auditService.createWithTransaction(tx, {
          tenantId,
          factoryId,
          userId: context.userId,
          action: 'STOCK_INCREASED',
          entityType: 'Stock',
          entityId: stockAfter.id,
          before: {
            quantity: beforeQuantity.toString(),
            productVariantId: item.productVariant.id,
            warehouseZoneId: finishedProductsZone.id,
          },
          after: {
            quantity: afterQuantity.toString(),
            productVariantId: item.productVariant.id,
            warehouseZoneId: finishedProductsZone.id,
          },
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            reason: 'ORDER_DELIVERY_RETURN',
          },
        });

        await this.auditService.createWithTransaction(tx, {
          tenantId,
          factoryId,
          userId: context.userId,
          action: 'STOCK_MOVEMENT_CREATED',
          entityType: 'StockMovement',
          entityId: stockMovement.id,
          after: {
            ...stockMovement,
            quantity: stockMovement.quantity.toString(),
            beforeQuantity: stockMovement.beforeQuantity?.toString() ?? null,
            afterQuantity: stockMovement.afterQuantity?.toString() ?? null,
          },
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            reason: 'ORDER_DELIVERY_RETURN',
          },
        });
      }

      const updatedOrder = await tx.salesOrder.update({
        where: { id_tenantId: { id: order.id, tenantId } },
        data: { status: SalesOrderStatus.READY },
        select: salesOrderSelect,
      });
      const response = this.mapSalesOrder(updatedOrder);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'SALES_ORDER_DELIVERY_RETURNED',
        entityType: 'SalesOrder',
        entityId: order.id,
        before: this.mapSalesOrder(order),
        after: response,
        metadata: {
          reason: 'ORDER_DELIVERY_RETURN',
          orderNumber: order.orderNumber,
          returnedItemCount: order.items.length,
        },
      });

      return response;
    });

    return { data: returnedOrder };
  }

  async getPayments(context: RequestContext): Promise<CollectionResponse<ClientPaymentResponse>> {
    // ClientPayment is tenant-scoped in schema v1. Resolving the factory context
    // still verifies the temporary demo tenant/factory pair, while payments stay
    // tenant-wide until a future factory attribution rule is explicitly added.
    const tenantId = context.tenantId;
    const payments = await this.prisma.clientPayment.findMany({
      where: { tenantId },
      orderBy: { paymentDate: 'desc' },
      take: RECENT_PAYMENT_LIMIT,
      select: clientPaymentSelect,
    });

    return {
      data: payments.map((payment) => this.mapClientPayment(payment)),
    };
  }

  async createPayment(
    context: RequestContext,
    dto: CreateClientPaymentDto,
  ): Promise<{ data: ClientPaymentResponse }> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const paymentAmount = this.parsePositiveDecimal(dto.amount, 'Payment amount');
    const allocationAmounts = dto.allocations.map((allocation) =>
      this.parsePositiveDecimal(allocation.amount, 'Allocation amount'),
    );
    const allocationTotal = this.sumDecimal(allocationAmounts);

    if (!allocationTotal.eq(paymentAmount)) {
      throw new BadRequestException(
        'Allocation total must exactly equal payment amount.',
      );
    }

    const orderIds = dto.allocations.map((allocation) => allocation.orderId);
    const uniqueOrderIds = [...new Set(orderIds)];

    if (uniqueOrderIds.length !== orderIds.length) {
      throw new BadRequestException('Duplicate order allocation is not allowed.');
    }

    const createdPayment = await this.prisma.$transaction(async (tx) => {
      const client = await tx.client.findFirst({
        where: {
          id: dto.clientId,
          tenantId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: clientSelect,
      });

      if (!client) {
        throw new NotFoundException('Active client not found.');
      }

      const orders = await tx.salesOrder.findMany({
        where: {
          id: { in: uniqueOrderIds },
          tenantId,
          factoryId,
          clientId: client.id,
          status: { in: DEBT_ORDER_STATUSES },
        },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          paymentStatus: true,
          allocations: {
            where: { payment: { reversedAt: null } },
            select: { amount: true },
          },
        },
      });
      const orderMap = new Map(orders.map((order) => [order.id, order]));

      if (orderMap.size !== uniqueOrderIds.length) {
        throw new NotFoundException(
          'Allocatable order not found for this client and factory.',
        );
      }

      for (const [index, allocation] of dto.allocations.entries()) {
        const order = orderMap.get(allocation.orderId);

        if (!order) {
          throw new NotFoundException('Allocatable order not found.');
        }

        const alreadyPaid = this.sumDecimal(
          order.allocations.map((existingAllocation) => existingAllocation.amount),
        );
        const remaining = order.totalAmount.minus(alreadyPaid);

        if (allocationAmounts[index].gt(remaining)) {
          throw new ConflictException(
            `Allocation exceeds remaining balance for order ${order.orderNumber}.`,
          );
        }
      }

      const payment = await tx.clientPayment.create({
        data: {
          tenant: { connect: { id: tenantId } },
          client: {
            connect: {
              id_tenantId: {
                id: client.id,
                tenantId,
              },
            },
          },
          amount: paymentAmount,
          method: dto.method,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          recordedBy: context.userId
            ? {
                connect: {
                  id_tenantId: {
                    id: context.userId,
                    tenantId,
                  },
                },
              }
            : undefined,
          note: dto.note ?? null,
        },
        select: { id: true },
      });

      await tx.clientPaymentAllocation.createMany({
        data: dto.allocations.map((allocation, index) => ({
          tenantId,
          paymentId: payment.id,
          orderId: allocation.orderId,
          amount: allocationAmounts[index],
        })),
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'CLIENT_PAYMENT_CREATED',
        entityType: 'ClientPayment',
        entityId: payment.id,
        after: {
          client,
          amount: paymentAmount.toString(),
          method: dto.method,
          paymentDate: dto.paymentDate ?? null,
          note: dto.note ?? null,
        },
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'CLIENT_PAYMENT_ALLOCATED',
        entityType: 'ClientPayment',
        entityId: payment.id,
        after: {
          allocations: dto.allocations.map((allocation, index) => ({
            orderId: allocation.orderId,
            amount: allocationAmounts[index].toString(),
          })),
        },
      });

      for (const [index, allocation] of dto.allocations.entries()) {
        const order = orderMap.get(allocation.orderId);

        if (!order) {
          continue;
        }

        const previousStatus = order.paymentStatus;
        const previousPaid = this.sumDecimal(
          order.allocations.map((existingAllocation) => existingAllocation.amount),
        );
        const newPaid = previousPaid.plus(allocationAmounts[index]);
        const nextStatus = this.resolveOrderPaymentStatus(
          order.totalAmount,
          newPaid,
        );

        if (nextStatus !== previousStatus) {
          await tx.salesOrder.update({
            where: {
              id_tenantId: {
                id: order.id,
                tenantId,
              },
            },
            data: { paymentStatus: nextStatus },
          });

          await this.auditService.createWithTransaction(tx, {
            tenantId,
            factoryId,
            userId: context.userId,
            action: 'SALES_ORDER_PAYMENT_STATUS_UPDATED',
            entityType: 'SalesOrder',
            entityId: order.id,
            before: { paymentStatus: previousStatus },
            after: { paymentStatus: nextStatus },
            metadata: {
              paymentId: payment.id,
              allocatedAmount: allocationAmounts[index].toString(),
            },
          });
        }
      }

      const paymentWithRelations = await tx.clientPayment.findUniqueOrThrow({
        where: {
          id_tenantId: {
            id: payment.id,
            tenantId,
          },
        },
        select: clientPaymentSelect,
      });

      return this.mapClientPayment(paymentWithRelations);
    });

    return { data: createdPayment };
  }

  async reversePayment(
    context: RequestContext,
    paymentId: string,
    dto: ReverseClientPaymentDto,
  ): Promise<{ data: ClientPaymentResponse }> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const reason = dto.reason.trim();

    if (!reason) {
      throw new BadRequestException('Reversal reason is required.');
    }

    const reversedPayment = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.clientPayment.findFirst({
        where: { id: paymentId, tenantId },
        select: {
          id: true,
          amount: true,
          method: true,
          paymentDate: true,
          note: true,
          reversedAt: true,
          reversalReason: true,
          client: { select: clientSelect },
          allocations: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              amount: true,
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  factoryId: true,
                  status: true,
                  paymentStatus: true,
                  totalAmount: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Client payment not found.');
      }

      if (payment.reversedAt) {
        throw new ConflictException('Client payment is already reversed.');
      }

      if (payment.allocations.length === 0) {
        throw new ConflictException(
          'Client payment has no allocations to reverse.',
        );
      }

      const affectedOrders = payment.allocations.map(
        (allocation) => allocation.order,
      );
      const invalidFactoryOrder = affectedOrders.find(
        (order) => order.factoryId !== factoryId,
      );

      if (invalidFactoryOrder) {
        throw new NotFoundException(
          'Allocated order not found for current factory context.',
        );
      }

      const blockedOrder = affectedOrders.find(
        (order) =>
          order.status === SalesOrderStatus.DELIVERED ||
          order.status === SalesOrderStatus.CLOSED,
      );

      if (blockedOrder) {
        throw new ConflictException(
          `Payment cannot be reversed because order ${blockedOrder.orderNumber} is ${blockedOrder.status}. Reverse delivery/admin state first.`,
        );
      }

      const now = new Date();
      const paymentBefore = {
        id: payment.id,
        amount: payment.amount.toString(),
        method: payment.method,
        paymentDate: payment.paymentDate,
        note: payment.note,
        reversedAt: payment.reversedAt,
        reversalReason: payment.reversalReason,
        client: payment.client,
        allocations: payment.allocations.map((allocation) => ({
          id: allocation.id,
          amount: allocation.amount.toString(),
          order: {
            id: allocation.order.id,
            orderNumber: allocation.order.orderNumber,
            status: allocation.order.status,
            paymentStatus: allocation.order.paymentStatus,
          },
        })),
      };

      await tx.clientPayment.update({
        where: {
          id_tenantId: {
            id: payment.id,
            tenantId,
          },
        },
        data: {
          reversedAt: now,
          reversedByUserId: context.userId,
          reversalReason: reason,
        },
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'CLIENT_PAYMENT_REVERSED',
        entityType: 'ClientPayment',
        entityId: payment.id,
        before: paymentBefore,
        after: {
          ...paymentBefore,
          reversedAt: now,
          reversedByUserId: context.userId,
          reversalReason: reason,
        },
        metadata: {
          reason,
          affectedOrderIds: affectedOrders.map((order) => order.id),
        },
      });

      for (const order of affectedOrders) {
        const paidAggregate = await tx.clientPaymentAllocation.aggregate({
          where: {
            tenantId,
            orderId: order.id,
            payment: { reversedAt: null },
          },
          _sum: { amount: true },
        });
        const validPaidAmount =
          paidAggregate._sum.amount ?? new Prisma.Decimal(0);
        const nextStatus = this.resolveOrderPaymentStatus(
          order.totalAmount,
          validPaidAmount,
        );

        if (nextStatus !== order.paymentStatus) {
          await tx.salesOrder.update({
            where: {
              id_tenantId: {
                id: order.id,
                tenantId,
              },
            },
            data: { paymentStatus: nextStatus },
          });

          await this.auditService.createWithTransaction(tx, {
            tenantId,
            factoryId,
            userId: context.userId,
            action: 'SALES_ORDER_PAYMENT_STATUS_UPDATED',
            entityType: 'SalesOrder',
            entityId: order.id,
            before: { paymentStatus: order.paymentStatus },
            after: { paymentStatus: nextStatus },
            metadata: {
              paymentId: payment.id,
              reason,
              validPaidAmount: validPaidAmount.toString(),
            },
          });
        }
      }

      const paymentWithRelations = await tx.clientPayment.findUniqueOrThrow({
        where: {
          id_tenantId: {
            id: payment.id,
            tenantId,
          },
        },
        select: clientPaymentSelect,
      });

      return this.mapClientPayment(paymentWithRelations);
    });

    return { data: reversedPayment };
  }

  async getDebts(context: RequestContext): Promise<CollectionResponse<ClientDebtResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const clients = await this.prisma.client.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        notes: true,
        status: true,
        orders: {
          where: {
            tenantId,
            factoryId,
            status: { in: DEBT_ORDER_STATUSES },
          },
          select: {
            totalAmount: true,
            allocations: {
              where: { payment: { reversedAt: null } },
              select: { amount: true },
            },
          },
        },
      },
    });

    return {
      data: clients.map((client) => {
        const totalOrders = this.sumDecimal(
          client.orders.map((order) => order.totalAmount),
        );
        const totalPaid = this.sumDecimal(
          client.orders.flatMap((order) =>
            order.allocations.map((allocation) => allocation.amount),
          ),
        );

        return {
          client: {
            id: client.id,
            name: client.name,
            phone: client.phone,
            address: client.address,
            notes: client.notes,
            status: client.status,
          },
          totalOrders: totalOrders.toString(),
          totalPaid: totalPaid.toString(),
          debt: totalOrders.minus(totalPaid).toString(),
        };
      }),
    };
  }

  private sumDecimal(values: Prisma.Decimal[]): Prisma.Decimal {
    return values.reduce(
      (total, value) => total.plus(value),
      new Prisma.Decimal(0),
    );
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

  private async resolveActiveProductPrice(
    tx: Prisma.TransactionClient,
    tenantId: string,
    productVariantId: string,
    at: Date,
  ): Promise<Prisma.Decimal> {
    const price = await tx.productPrice.findFirst({
      where: {
        tenantId,
        productVariantId,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      select: { amount: true },
    });

    if (!price) {
      throw new ConflictException(
        'Active product price not found. Provide unitPrice or add an active product price.',
      );
    }

    return price.amount;
  }

  private parsePositiveDecimal(value: string, label: string): Prisma.Decimal {
    const decimal = new Prisma.Decimal(value);

    if (!decimal.isFinite() || decimal.lte(0)) {
      throw new BadRequestException(`${label} must be positive.`);
    }

    return decimal;
  }

  private generateOrderNumber(now: Date): string {
    const datePart = now.toISOString().slice(0, 10).replaceAll('-', '');

    return `SO-${datePart}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private mapSalesOrder(
    order: Prisma.SalesOrderGetPayload<{ select: typeof salesOrderSelect }>,
  ): SalesOrderResponse {
    return {
      ...order,
      totalAmount: order.totalAmount.toString(),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      })),
    };
  }

  private mapClientPayment(
    payment: Prisma.ClientPaymentGetPayload<{ select: typeof clientPaymentSelect }>,
  ): ClientPaymentResponse {
    return {
      ...payment,
      amount: payment.amount.toString(),
      allocations: payment.allocations.map((allocation) => ({
        ...allocation,
        amount: allocation.amount.toString(),
      })),
    };
  }

  private resolveOrderPaymentStatus(
    totalAmount: Prisma.Decimal,
    paidAmount: Prisma.Decimal,
  ): PaymentStatus {
    if (paidAmount.lte(0)) {
      return PaymentStatus.UNPAID;
    }

    if (paidAmount.gte(totalAmount)) {
      return PaymentStatus.PAID;
    }

    return PaymentStatus.PARTIALLY_PAID;
  }
}

const clientSelect = {
  id: true,
  name: true,
  phone: true,
  address: true,
  notes: true,
  status: true,
} satisfies Prisma.ClientSelect;

const salesOrderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  deadline: true,
  totalAmount: true,
  paymentStatus: true,
  createdAt: true,
  updatedAt: true,
  cancelledAt: true,
  closedAt: true,
  client: { select: clientSelect },
  createdBy: { select: { id: true, name: true } },
  items: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      productVariant: {
        select: {
          id: true,
          product: { select: { id: true, name: true } },
          color: { select: { id: true, name: true } },
          material: { select: { id: true, name: true } },
          season: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.SalesOrderSelect;

const clientPaymentSelect = {
  id: true,
  amount: true,
  method: true,
  paymentDate: true,
  note: true,
  reversedAt: true,
  reversalReason: true,
  createdAt: true,
  client: { select: clientSelect },
  recordedBy: { select: { id: true, name: true } },
  reversedBy: { select: { id: true, name: true } },
  allocations: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      amount: true,
      order: { select: { id: true, orderNumber: true } },
    },
  },
} satisfies Prisma.ClientPaymentSelect;
