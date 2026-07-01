import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import {
  CreateSupplierPaymentDto,
  CreateSupplierPurchaseDto,
  SupplierDto,
} from './supplier.dto';
import {
  CollectionResponse,
  SupplierDebtResponse,
  SupplierPaymentResponse,
  SupplierPurchaseResponse,
  SupplierResponse,
} from './supplier.types';

const RECENT_PAYMENT_LIMIT = 50;

@Injectable()
export class SupplierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getSuppliers(context: RequestContext): Promise<CollectionResponse<SupplierResponse>> {
    const tenantId = context.tenantId;
    const suppliers = await this.prisma.supplier.findMany({
      where: { tenantId, status: 'ACTIVE', deletedAt: null },
      orderBy: { name: 'asc' },
      select: supplierSelect,
    });

    return { data: suppliers };
  }

  async createSupplier(
    context: RequestContext,
    dto: SupplierDto,
  ): Promise<{ data: SupplierResponse }> {
    const tenantId = context.tenantId;

    const supplier = await this.prisma.$transaction(async (tx) => {
      const createdSupplier = await tx.supplier.create({
        data: {
          tenantId,
          name: dto.name,
          phone: dto.phone ?? null,
          notes: dto.notes ?? null,
          status: 'ACTIVE',
        },
        select: supplierSelect,
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId: null,
        userId: context.userId,
        action: 'SUPPLIER_CREATED',
        entityType: 'Supplier',
        entityId: createdSupplier.id,
        after: createdSupplier,
      });

      return createdSupplier;
    });

    return { data: supplier };
  }

  async updateSupplier(
    context: RequestContext,
    id: string,
    dto: SupplierDto,
  ): Promise<{ data: SupplierResponse }> {
    const tenantId = context.tenantId;

    const supplier = await this.prisma.$transaction(async (tx) => {
      const existingSupplier = await tx.supplier.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: supplierSelect,
      });

      if (!existingSupplier) {
        throw new NotFoundException('Supplier not found.');
      }

      const updatedSupplier = await tx.supplier.update({
        where: { id: existingSupplier.id },
        data: {
          name: dto.name,
          phone: dto.phone ?? null,
          notes: dto.notes ?? null,
        },
        select: supplierSelect,
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId: null,
        userId: context.userId,
        action: 'SUPPLIER_UPDATED',
        entityType: 'Supplier',
        entityId: updatedSupplier.id,
        before: existingSupplier,
        after: updatedSupplier,
      });

      return updatedSupplier;
    });

    return { data: supplier };
  }

  async archiveSupplier(
    context: RequestContext,
    id: string,
  ): Promise<{ data: SupplierResponse }> {
    const tenantId = context.tenantId;

    const supplier = await this.prisma.$transaction(async (tx) => {
      const existingSupplier = await tx.supplier.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: supplierSelect,
      });

      if (!existingSupplier) {
        throw new NotFoundException('Supplier not found.');
      }

      const archivedSupplier = await tx.supplier.update({
        where: { id: existingSupplier.id },
        data: {
          status: 'INACTIVE',
          deletedAt: new Date(),
        },
        select: supplierSelect,
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId: null,
        userId: context.userId,
        action: 'SUPPLIER_ARCHIVED',
        entityType: 'Supplier',
        entityId: archivedSupplier.id,
        before: existingSupplier,
        after: archivedSupplier,
      });

      return archivedSupplier;
    });

    return { data: supplier };
  }

  async getPurchases(
    context: RequestContext,
  ): Promise<CollectionResponse<SupplierPurchaseResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const purchases = await this.prisma.supplierPurchase.findMany({
      where: { tenantId, factoryId },
      orderBy: { purchasedAt: 'desc' },
      select: supplierPurchaseSelect,
    });

    return {
      data: purchases.map((purchase) => this.mapSupplierPurchase(purchase)),
    };
  }

  async createPurchase(
    context: RequestContext,
    dto: CreateSupplierPurchaseDto,
  ): Promise<{ data: SupplierPurchaseResponse }> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const now = new Date();

    const purchase = await this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: {
          id: dto.supplierId,
          tenantId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: supplierSelect,
      });

      if (!supplier) {
        throw new NotFoundException('Active supplier not found.');
      }

      const materialIds = [...new Set(dto.items.map((item) => item.materialId))];
      const materials = await tx.material.findMany({
        where: { id: { in: materialIds }, tenantId, deletedAt: null },
        select: { id: true },
      });
      const materialMap = new Map(materials.map((material) => [material.id, material]));

      if (materialMap.size !== materialIds.length) {
        throw new NotFoundException('Active material not found.');
      }

      const purchaseItems: Prisma.SupplierPurchaseItemCreateWithoutPurchaseInput[] = [];
      let totalAmount = new Prisma.Decimal(0);

      for (const item of dto.items) {
        const material = materialMap.get(item.materialId);

        if (!material) {
          throw new NotFoundException('Active material not found.');
        }

        const quantity = this.parsePositiveDecimal(item.quantity, 'Quantity');
        const unitPrice = this.parsePositiveDecimal(item.unitPrice, 'Unit price');
        const totalPrice = quantity.mul(unitPrice);

        totalAmount = totalAmount.plus(totalPrice);
        purchaseItems.push({
          tenant: { connect: { id: tenantId } },
          material: {
            connect: {
              id_tenantId: {
                id: material.id,
                tenantId,
              },
            },
          },
          quantity,
          unit: item.unit,
          unitPrice,
          totalPrice,
        });
      }

      const createdPurchase = await tx.supplierPurchase.create({
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
          supplier: {
            connect: {
              id_tenantId: {
                id: supplier.id,
                tenantId,
              },
            },
          },
          purchaseNumber: this.generatePurchaseNumber(now),
          totalAmount,
          paymentStatus: PaymentStatus.UNPAID,
          purchasedAt: dto.purchaseDate ? new Date(dto.purchaseDate) : now,
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
          items: { create: purchaseItems },
        },
        select: supplierPurchaseSelect,
      });

      const response = this.mapSupplierPurchase(createdPurchase);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'SUPPLIER_PURCHASE_CREATED',
        entityType: 'SupplierPurchase',
        entityId: createdPurchase.id,
        after: response,
        metadata: dto.note ? { note: dto.note } : null,
      });

      return response;
    });

    return { data: purchase };
  }

  async getPayments(
    context: RequestContext,
  ): Promise<CollectionResponse<SupplierPaymentResponse>> {
    // SupplierPayment is tenant-scoped in schema v1. Resolving the factory
    // context verifies the temporary demo context, while payments remain
    // tenant-wide until factory ownership rules are explicitly approved.
    const tenantId = context.tenantId;
    const payments = await this.prisma.supplierPayment.findMany({
      where: { tenantId },
      orderBy: { paymentDate: 'desc' },
      take: RECENT_PAYMENT_LIMIT,
      select: supplierPaymentSelect,
    });

    return {
      data: payments.map((payment) => this.mapSupplierPayment(payment)),
    };
  }

  async createPayment(
    context: RequestContext,
    dto: CreateSupplierPaymentDto,
  ): Promise<{ data: SupplierPaymentResponse }> {
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

    const purchaseIds = dto.allocations.map((allocation) => allocation.purchaseId);
    const uniquePurchaseIds = [...new Set(purchaseIds)];

    if (uniquePurchaseIds.length !== purchaseIds.length) {
      throw new BadRequestException('Duplicate purchase allocation is not allowed.');
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: {
          id: dto.supplierId,
          tenantId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: supplierSelect,
      });

      if (!supplier) {
        throw new NotFoundException('Active supplier not found.');
      }

      const purchases = await tx.supplierPurchase.findMany({
        where: {
          id: { in: uniquePurchaseIds },
          tenantId,
          factoryId,
          supplierId: supplier.id,
          cancelledAt: null,
        },
        select: {
          id: true,
          purchaseNumber: true,
          totalAmount: true,
          paymentStatus: true,
          allocations: { select: { amount: true } },
        },
      });
      const purchaseMap = new Map(
        purchases.map((purchase) => [purchase.id, purchase]),
      );

      if (purchaseMap.size !== uniquePurchaseIds.length) {
        throw new NotFoundException(
          'Allocatable purchase not found for this supplier and factory.',
        );
      }

      for (const [index, allocation] of dto.allocations.entries()) {
        const purchase = purchaseMap.get(allocation.purchaseId);

        if (!purchase) {
          throw new NotFoundException('Allocatable purchase not found.');
        }

        const alreadyPaid = this.sumDecimal(
          purchase.allocations.map((existingAllocation) => existingAllocation.amount),
        );
        const remaining = purchase.totalAmount.minus(alreadyPaid);

        if (allocationAmounts[index].gt(remaining)) {
          throw new ConflictException(
            `Allocation exceeds remaining balance for purchase ${purchase.purchaseNumber}.`,
          );
        }
      }

      const createdPayment = await tx.supplierPayment.create({
        data: {
          tenant: { connect: { id: tenantId } },
          supplier: {
            connect: {
              id_tenantId: {
                id: supplier.id,
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

      await tx.supplierPaymentAllocation.createMany({
        data: dto.allocations.map((allocation, index) => ({
          tenantId,
          paymentId: createdPayment.id,
          purchaseId: allocation.purchaseId,
          amount: allocationAmounts[index],
        })),
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'SUPPLIER_PAYMENT_CREATED',
        entityType: 'SupplierPayment',
        entityId: createdPayment.id,
        after: {
          supplier,
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
        action: 'SUPPLIER_PAYMENT_ALLOCATED',
        entityType: 'SupplierPayment',
        entityId: createdPayment.id,
        after: {
          allocations: dto.allocations.map((allocation, index) => ({
            purchaseId: allocation.purchaseId,
            amount: allocationAmounts[index].toString(),
          })),
        },
      });

      for (const [index, allocation] of dto.allocations.entries()) {
        const purchase = purchaseMap.get(allocation.purchaseId);

        if (!purchase) {
          continue;
        }

        const previousStatus = purchase.paymentStatus;
        const previousPaid = this.sumDecimal(
          purchase.allocations.map((existingAllocation) => existingAllocation.amount),
        );
        const newPaid = previousPaid.plus(allocationAmounts[index]);
        const nextStatus = this.resolvePaymentStatus(
          purchase.totalAmount,
          newPaid,
        );

        if (nextStatus !== previousStatus) {
          await tx.supplierPurchase.update({
            where: {
              id_tenantId: {
                id: purchase.id,
                tenantId,
              },
            },
            data: { paymentStatus: nextStatus },
          });

          await this.auditService.createWithTransaction(tx, {
            tenantId,
            factoryId,
            userId: context.userId,
            action: 'SUPPLIER_PURCHASE_PAYMENT_STATUS_UPDATED',
            entityType: 'SupplierPurchase',
            entityId: purchase.id,
            before: { paymentStatus: previousStatus },
            after: { paymentStatus: nextStatus },
            metadata: {
              paymentId: createdPayment.id,
              allocatedAmount: allocationAmounts[index].toString(),
            },
          });
        }
      }

      const paymentWithRelations = await tx.supplierPayment.findUniqueOrThrow({
        where: {
          id_tenantId: {
            id: createdPayment.id,
            tenantId,
          },
        },
        select: supplierPaymentSelect,
      });

      return this.mapSupplierPayment(paymentWithRelations);
    });

    return { data: payment };
  }

  async getDebts(context: RequestContext): Promise<CollectionResponse<SupplierDebtResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const suppliers = await this.prisma.supplier.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        notes: true,
        status: true,
        purchases: {
          where: {
            tenantId,
            factoryId,
            cancelledAt: null,
          },
          select: {
            totalAmount: true,
            allocations: { select: { amount: true } },
          },
        },
      },
    });

    return {
      data: suppliers.map((supplier) => {
        const totalPurchases = this.sumDecimal(
          supplier.purchases.map((purchase) => purchase.totalAmount),
        );
        const totalPaid = this.sumDecimal(
          supplier.purchases.flatMap((purchase) =>
            purchase.allocations.map((allocation) => allocation.amount),
          ),
        );

        return {
          supplier: {
            id: supplier.id,
            name: supplier.name,
            phone: supplier.phone,
            notes: supplier.notes,
            status: supplier.status,
          },
          totalPurchases: totalPurchases.toString(),
          totalPaid: totalPaid.toString(),
          debt: totalPurchases.minus(totalPaid).toString(),
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

  private parsePositiveDecimal(value: string, label: string): Prisma.Decimal {
    const decimal = new Prisma.Decimal(value);

    if (!decimal.isFinite() || decimal.lte(0)) {
      throw new BadRequestException(`${label} must be positive.`);
    }

    return decimal;
  }

  private generatePurchaseNumber(now: Date): string {
    const datePart = now.toISOString().slice(0, 10).replaceAll('-', '');

    return `SP-${datePart}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private mapSupplierPurchase(
    purchase: Prisma.SupplierPurchaseGetPayload<{ select: typeof supplierPurchaseSelect }>,
  ): SupplierPurchaseResponse {
    return {
      ...purchase,
      totalAmount: purchase.totalAmount.toString(),
      items: purchase.items.map((item) => ({
        ...item,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      })),
    };
  }

  private mapSupplierPayment(
    payment: Prisma.SupplierPaymentGetPayload<{ select: typeof supplierPaymentSelect }>,
  ): SupplierPaymentResponse {
    return {
      ...payment,
      amount: payment.amount.toString(),
      allocations: payment.allocations.map((allocation) => ({
        ...allocation,
        amount: allocation.amount.toString(),
      })),
    };
  }

  private resolvePaymentStatus(
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

const supplierSelect = {
  id: true,
  name: true,
  phone: true,
  notes: true,
  status: true,
} satisfies Prisma.SupplierSelect;

const supplierPurchaseSelect = {
  id: true,
  purchaseNumber: true,
  totalAmount: true,
  paymentStatus: true,
  purchasedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  supplier: { select: supplierSelect },
  createdBy: { select: { id: true, name: true } },
  items: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      quantity: true,
      unit: true,
      unitPrice: true,
      totalPrice: true,
      material: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.SupplierPurchaseSelect;

const supplierPaymentSelect = {
  id: true,
  amount: true,
  method: true,
  paymentDate: true,
  note: true,
  createdAt: true,
  supplier: { select: supplierSelect },
  recordedBy: { select: { id: true, name: true } },
  allocations: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      amount: true,
      purchase: { select: { id: true, purchaseNumber: true } },
    },
  },
} satisfies Prisma.SupplierPaymentSelect;
