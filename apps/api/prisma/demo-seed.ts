/**
 * Full 1–2 month operational demo for Paypoq OS.
 *
 * Prerequisites: baseline `prisma/seed.ts` (tenant, factory, catalog master data, users).
 * Run via: `pnpm demo:prepare` (reset + baseline + this file).
 *
 * Scenarios covered:
 * - Catalog prices, salary rates, employees
 * - Production WIP + activities across last month and current month
 * - Warehouse finished goods + materials + low-stock threshold
 * - Sales: delivered + open orders, payments, client debt
 * - Supplier purchase + partial payment
 * - Expenses: REQUESTED / APPROVED / PAID workflow
 * - Advances: REQUESTED (manager pending) / APPROVED / PAID (owner+manager path)
 * - Payroll: previous month CLOSED, current month CALCULATED + partial pay
 */
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_TENANT_ID = 'seed-demo-paypoq-factory';

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: DEMO_TENANT_ID },
  });

  if (!tenant) {
    throw new Error('Baseline tenant not found. Run baseline seed before demo seed.');
  }

  const tenantId = tenant.id;
  const now = new Date();
  const currentMonth = startOfMonth(now);
  const previousMonth = addMonths(currentMonth, -1);
  const midPrevMonth = new Date(previousMonth);
  midPrevMonth.setUTCDate(15);
  const latePrevMonth = new Date(previousMonth);
  latePrevMonth.setUTCDate(25);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'ACTIVE',
      subscriptionStatus: 'TRIAL',
      planCode: 'pilot',
      contactName: 'Demo Owner',
      contactPhone: '+998 90 000 00 00',
      contactEmail: 'owner@paypoq.local',
      notes:
        'To‘liq demo: 2 oy ishlab chiqarish, sotuv, avans (so‘rov→tasdiq→to‘lov), ish haqi.',
      pilotStartedAt: previousMonth,
    },
  });

  const factory = await prisma.factory.findFirstOrThrow({
    where: { tenantId, name: 'Main Factory', deletedAt: null },
  });
  const warehouse = await prisma.warehouse.findFirstOrThrow({
    where: { tenantId, factoryId: factory.id, name: 'Main Warehouse' },
  });
  const finishedZone = await prisma.warehouseZone.findFirstOrThrow({
    where: { tenantId, warehouseId: warehouse.id, name: 'Finished Products' },
  });
  const rawZone = await prisma.warehouseZone.findFirstOrThrow({
    where: { tenantId, warehouseId: warehouse.id, name: 'Raw Materials' },
  });

  const owner = await prisma.user.findFirstOrThrow({
    where: { tenantId, email: 'owner@paypoq.local' },
  });
  const manager = await prisma.user.findFirstOrThrow({
    where: { tenantId, email: 'manager@paypoq.local' },
  });
  const warehouseUser = await prisma.user.findFirstOrThrow({
    where: { tenantId, email: 'warehouse@paypoq.local' },
  });
  const shiftUser = await prisma.user.findFirstOrThrow({
    where: { tenantId, email: 'shift@paypoq.local' },
  });
  const sellerUser = await prisma.user.findFirstOrThrow({
    where: { tenantId, email: 'seller@paypoq.local' },
  });
  const accountantUser = await prisma.user.findFirstOrThrow({
    where: { tenantId, email: 'accountant@paypoq.local' },
  });

  const stages = await prisma.productionStage.findMany({
    where: { tenantId, factoryId: factory.id, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
  });
  const stageByName = new Map(stages.map((stage) => [stage.name, stage]));

  const black = await findColor(tenantId, 'Qora');
  const white = await findColor(tenantId, 'Oq');
  const cotton = await findMaterial(tenantId, 'Paxta');
  const bamboo = await findMaterial(tenantId, 'Bamboo');
  const universal = await findSeason(tenantId, 'Universal');
  const summer = await findSeason(tenantId, 'Yozgi');

  // --- Catalog ---
  const classic = await prisma.product.upsert({
    where: { tenantId_name: { tenantId, name: 'Classic Paypoq' } },
    create: { tenantId, name: 'Classic Paypoq', code: 'CLS' },
    update: { deletedAt: null },
  });
  const sport = await prisma.product.upsert({
    where: { tenantId_name: { tenantId, name: 'Sport Paypoq' } },
    create: { tenantId, name: 'Sport Paypoq', code: 'SPT' },
    update: { deletedAt: null },
  });

  const classicBlack = await upsertVariant(
    tenantId,
    classic.id,
    black.id,
    cotton.id,
    universal.id,
  );
  const sportWhite = await upsertVariant(
    tenantId,
    sport.id,
    white.id,
    bamboo.id,
    summer.id,
  );

  await prisma.productPrice.deleteMany({
    where: { tenantId, productId: { in: [classic.id, sport.id] } },
  });
  await prisma.productPrice.createMany({
    data: [
      {
        tenantId,
        productId: classic.id,
        productVariantId: classicBlack.id,
        amount: new Prisma.Decimal('12000'),
        effectiveFrom: previousMonth,
      },
      {
        tenantId,
        productId: sport.id,
        productVariantId: sportWhite.id,
        amount: new Prisma.Decimal('15000'),
        effectiveFrom: previousMonth,
      },
    ],
  });

  // --- Employees (piece-rate workers) ---
  const employeeNames = [
    'Ali Averlogchi',
    'Vali Dazmolchi',
    'Dilshod Sifat nazorati',
    'Sardor Qadoqlovchi',
  ] as const;
  const employees = [];
  for (const name of employeeNames) {
    const existing = await prisma.employee.findFirst({
      where: { tenantId, factoryId: factory.id, name, deletedAt: null },
    });
    if (existing) {
      employees.push(existing);
      continue;
    }
    employees.push(
      await prisma.employee.create({
        data: {
          tenantId,
          factoryId: factory.id,
          name,
          status: 'ACTIVE',
        },
      }),
    );
  }
  const [ali, vali, dilshod, sardor] = employees;

  // Ishbay ishchilar — bosqich biriktirish
  await prisma.employeeStageAssignment.deleteMany({
    where: { tenantId, factoryId: factory.id },
  });
  await prisma.employeeStageAssignment.createMany({
    data: [
      { tenantId, factoryId: factory.id, employeeId: ali.id, productionStageId: requireStage(stageByName, 'Averlog').id },
      { tenantId, factoryId: factory.id, employeeId: vali.id, productionStageId: requireStage(stageByName, 'Dazmol').id },
      { tenantId, factoryId: factory.id, employeeId: dilshod.id, productionStageId: requireStage(stageByName, 'Sifat').id },
      { tenantId, factoryId: factory.id, employeeId: sardor.id, productionStageId: requireStage(stageByName, 'Qadoqlash').id },
    ],
  });

  // --- Salary rates ---
  await prisma.salaryRate.deleteMany({ where: { tenantId, factoryId: factory.id } });
  // Stage-only rates for all piece-rate stages (Ombor excluded).
  const stageRateAmounts: Array<[string, string]> = [
    ['Averlog', '120'],
    ['Dazmol', '80'],
    ['Sifat', '60'],
    ['Kiydirish', '70'],
    ['Par Dazmol', '75'],
    ['Parlash', '65'],
    ['Bezak', '55'],
    ['Etiketka', '45'],
    ['Qadoqlash', '50'],
  ];
  await prisma.salaryRate.createMany({
    data: stageRateAmounts.map(([stageName, amount]) => ({
      tenantId,
      factoryId: factory.id,
      productionStageId: requireStage(stageByName, stageName).id,
      amount: new Prisma.Decimal(amount),
      effectiveFrom: previousMonth,
    })),
  });

  // --- Stage inventory (current WIP) ---
  await prisma.stageInventory.deleteMany({
    where: { tenantId, factoryId: factory.id },
  });
  await prisma.stageInventory.createMany({
    data: [
      inv(tenantId, factory.id, stageByName, 'Averlog', classicBlack.id, 480),
      inv(tenantId, factory.id, stageByName, 'Dazmol', classicBlack.id, 720),
      inv(tenantId, factory.id, stageByName, 'Sifat', classicBlack.id, 260),
      inv(tenantId, factory.id, stageByName, 'Qadoqlash', sportWhite.id, 190),
      inv(tenantId, factory.id, stageByName, 'Ombor', classicBlack.id, 350),
    ],
  });

  // --- Production batches + movements ---
  await prisma.stageMovement.deleteMany({ where: { tenantId, factoryId: factory.id } });
  await prisma.productionBatch.deleteMany({ where: { tenantId, factoryId: factory.id } });

  const batchPrev = await prisma.productionBatch.create({
    data: {
      tenantId,
      factoryId: factory.id,
      productVariantId: classicBlack.id,
      quantity: 500,
      createdByUserId: shiftUser.id,
      createdAt: midPrevMonth,
    },
  });
  const batchCurr = await prisma.productionBatch.create({
    data: {
      tenantId,
      factoryId: factory.id,
      productVariantId: classicBlack.id,
      quantity: 500,
      createdByUserId: shiftUser.id,
      createdAt: daysAgo(5),
    },
  });

  await prisma.stageMovement.createMany({
    data: [
      mov(tenantId, factory.id, stageByName, shiftUser.id, batchPrev.id, 'Averlog', 'Dazmol', classicBlack.id, 500, midPrevMonth),
      mov(tenantId, factory.id, stageByName, shiftUser.id, batchPrev.id, 'Dazmol', 'Sifat', classicBlack.id, 450, latePrevMonth),
      mov(tenantId, factory.id, stageByName, shiftUser.id, batchCurr.id, 'Averlog', 'Dazmol', classicBlack.id, 400, daysAgo(4)),
      mov(tenantId, factory.id, stageByName, shiftUser.id, batchCurr.id, 'Qadoqlash', 'Ombor', sportWhite.id, 180, daysAgo(2)),
    ],
  });

  // --- Worker activities: previous + current month ---
  await prisma.workerActivity.deleteMany({ where: { tenantId, factoryId: factory.id } });
  await prisma.workerActivity.createMany({
    data: [
      // Previous month (closed payroll basis)
      act(tenantId, factory.id, stageByName, shiftUser.id, ali.id, 'Averlog', classicBlack.id, 800, '120', midPrevMonth),
      act(tenantId, factory.id, stageByName, shiftUser.id, vali.id, 'Dazmol', classicBlack.id, 700, '80', midPrevMonth),
      act(tenantId, factory.id, stageByName, shiftUser.id, dilshod.id, 'Sifat', classicBlack.id, 650, '60', latePrevMonth),
      act(tenantId, factory.id, stageByName, shiftUser.id, sardor.id, 'Qadoqlash', sportWhite.id, 500, '50', latePrevMonth),
      // Current month (open payroll)
      act(tenantId, factory.id, stageByName, shiftUser.id, ali.id, 'Averlog', classicBlack.id, 420, '120', daysAgo(6)),
      act(tenantId, factory.id, stageByName, shiftUser.id, ali.id, 'Averlog', classicBlack.id, 300, '120', daysAgo(2)),
      act(tenantId, factory.id, stageByName, shiftUser.id, vali.id, 'Dazmol', classicBlack.id, 360, '80', daysAgo(5)),
      act(tenantId, factory.id, stageByName, shiftUser.id, dilshod.id, 'Sifat', classicBlack.id, 250, '60', daysAgo(3)),
      act(tenantId, factory.id, stageByName, shiftUser.id, sardor.id, 'Qadoqlash', sportWhite.id, 200, '50', daysAgo(1)),
    ],
  });

  await prisma.defect.deleteMany({ where: { tenantId, factoryId: factory.id } });
  await prisma.defect.create({
    data: {
      tenantId,
      factoryId: factory.id,
      employeeId: dilshod.id,
      productionStageId: requireStage(stageByName, 'Sifat').id,
      productVariantId: classicBlack.id,
      quantity: 8,
      reason: 'Tikuv sifati past',
      reportedByUserId: shiftUser.id,
      detectedAt: daysAgo(3),
    },
  });

  // --- Warehouse stock ---
  await prisma.stockMovement.deleteMany({ where: { tenantId, factoryId: factory.id } });
  await prisma.stock.deleteMany({ where: { tenantId, factoryId: factory.id } });
  await prisma.materialStock.deleteMany({ where: { tenantId, factoryId: factory.id } });

  await prisma.stock.createMany({
    data: [
      {
        tenantId,
        factoryId: factory.id,
        warehouseId: warehouse.id,
        warehouseZoneId: finishedZone.id,
        productVariantId: classicBlack.id,
        quantity: 1250,
      },
      {
        tenantId,
        factoryId: factory.id,
        warehouseId: warehouse.id,
        warehouseZoneId: finishedZone.id,
        productVariantId: sportWhite.id,
        quantity: 580,
      },
    ],
  });
  await prisma.materialStock.createMany({
    data: [
      {
        tenantId,
        factoryId: factory.id,
        warehouseId: warehouse.id,
        warehouseZoneId: rawZone.id,
        materialId: cotton.id,
        quantity: new Prisma.Decimal('85.500'),
        unit: 'kg',
      },
      {
        tenantId,
        factoryId: factory.id,
        warehouseId: warehouse.id,
        warehouseZoneId: rawZone.id,
        materialId: bamboo.id,
        quantity: new Prisma.Decimal('4.000'),
        unit: 'kg',
      },
    ],
  });
  await prisma.lowStockThreshold.upsert({
    where: {
      tenantId_warehouseId_materialId: {
        tenantId,
        warehouseId: warehouse.id,
        materialId: bamboo.id,
      },
    },
    create: {
      tenantId,
      warehouseId: warehouse.id,
      materialId: bamboo.id,
      quantity: new Prisma.Decimal('10.000'),
    },
    update: {
      quantity: new Prisma.Decimal('10.000'),
      deletedAt: null,
    },
  });
  await prisma.stockMovement.createMany({
    data: [
      sm(tenantId, factory.id, warehouse, finishedZone.id, warehouseUser.id, 'PRODUCT', 'PRODUCTION_RECEIPT', classicBlack.id, null, '800', 'pcs', daysAgo(20)),
      sm(tenantId, factory.id, warehouse, finishedZone.id, warehouseUser.id, 'PRODUCT', 'PRODUCTION_RECEIPT', sportWhite.id, null, '400', 'pcs', daysAgo(18)),
      sm(tenantId, factory.id, warehouse, rawZone.id, warehouseUser.id, 'MATERIAL', 'RECEIPT', null, cotton.id, '100.000', 'kg', daysAgo(25)),
      sm(tenantId, factory.id, warehouse, rawZone.id, warehouseUser.id, 'MATERIAL', 'RECEIPT', null, bamboo.id, '12.000', 'kg', daysAgo(25)),
    ],
  });

  // --- Sales ---
  await prisma.clientPaymentAllocation.deleteMany({
    where: { payment: { tenantId } },
  });
  await prisma.clientPayment.deleteMany({ where: { tenantId } });
  await prisma.salesOrderItem.deleteMany({
    where: { order: { tenantId } },
  });
  await prisma.salesOrder.deleteMany({ where: { tenantId } });
  await prisma.client.deleteMany({ where: { tenantId } });

  const clientAndijon = await prisma.client.create({
    data: {
      tenantId,
      name: 'Andijon Savdo',
      phone: '+998 91 111 22 33',
      address: 'Andijon',
      status: 'ACTIVE',
    },
  });
  const clientSamarqand = await prisma.client.create({
    data: {
      tenantId,
      name: 'Samarqand Optom',
      phone: '+998 93 444 55 66',
      address: 'Samarqand',
      status: 'ACTIVE',
    },
  });

  const deliveredPrev = await prisma.salesOrder.create({
    data: {
      tenantId,
      factoryId: factory.id,
      clientId: clientAndijon.id,
      orderNumber: 'DEMO-ORD-PREV-001',
      status: 'DELIVERED',
      totalAmount: new Prisma.Decimal('2400000'),
      paymentStatus: 'PAID',
      createdByUserId: sellerUser.id,
      createdAt: midPrevMonth,
      items: {
        create: [
          {
            productVariantId: classicBlack.id,
            quantity: 200,
            unitPrice: new Prisma.Decimal('12000'),
            totalPrice: new Prisma.Decimal('2400000'),
          },
        ],
      },
    },
  });
  const openCurr = await prisma.salesOrder.create({
    data: {
      tenantId,
      factoryId: factory.id,
      clientId: clientAndijon.id,
      orderNumber: 'DEMO-ORD-CURR-001',
      status: 'CONFIRMED',
      totalAmount: new Prisma.Decimal('750000'),
      paymentStatus: 'PARTIALLY_PAID',
      createdByUserId: sellerUser.id,
      createdAt: daysAgo(7),
      items: {
        create: [
          {
            productVariantId: sportWhite.id,
            quantity: 50,
            unitPrice: new Prisma.Decimal('15000'),
            totalPrice: new Prisma.Decimal('750000'),
          },
        ],
      },
    },
  });
  const unpaidCurr = await prisma.salesOrder.create({
    data: {
      tenantId,
      factoryId: factory.id,
      clientId: clientSamarqand.id,
      orderNumber: 'DEMO-ORD-CURR-002',
      status: 'CONFIRMED',
      totalAmount: new Prisma.Decimal('1200000'),
      paymentStatus: 'UNPAID',
      createdByUserId: sellerUser.id,
      createdAt: daysAgo(3),
      items: {
        create: [
          {
            productVariantId: classicBlack.id,
            quantity: 100,
            unitPrice: new Prisma.Decimal('12000'),
            totalPrice: new Prisma.Decimal('1200000'),
          },
        ],
      },
    },
  });
  void unpaidCurr;

  await prisma.clientPayment.create({
    data: {
      tenantId,
      clientId: clientAndijon.id,
      amount: new Prisma.Decimal('2400000'),
      method: 'TRANSFER',
      paymentDate: latePrevMonth,
      recordedByUserId: sellerUser.id,
      allocations: {
        create: [{ orderId: deliveredPrev.id, amount: new Prisma.Decimal('2400000') }],
      },
    },
  });
  await prisma.clientPayment.create({
    data: {
      tenantId,
      clientId: clientAndijon.id,
      amount: new Prisma.Decimal('300000'),
      method: 'CASH',
      paymentDate: daysAgo(4),
      recordedByUserId: sellerUser.id,
      allocations: {
        create: [{ orderId: openCurr.id, amount: new Prisma.Decimal('300000') }],
      },
    },
  });

  // --- Supplier ---
  await prisma.supplierPaymentAllocation.deleteMany({
    where: { payment: { tenantId } },
  });
  await prisma.supplierPayment.deleteMany({ where: { tenantId } });
  await prisma.supplierPurchaseItem.deleteMany({
    where: { purchase: { tenantId } },
  });
  await prisma.supplierPurchase.deleteMany({ where: { tenantId } });
  await prisma.supplier.deleteMany({ where: { tenantId } });

  const supplier = await prisma.supplier.create({
    data: {
      tenantId,
      name: 'Yarn Textile LLC',
      phone: '+998 93 222 33 44',
      status: 'ACTIVE',
    },
  });
  const purchase = await prisma.supplierPurchase.create({
    data: {
      tenantId,
      factoryId: factory.id,
      supplierId: supplier.id,
      purchaseNumber: 'DEMO-PUR-001',
      totalAmount: new Prisma.Decimal('6000000'),
      paymentStatus: 'PARTIALLY_PAID',
      purchasedAt: midPrevMonth,
      createdByUserId: accountantUser.id,
      items: {
        create: [
          {
            materialId: cotton.id,
            quantity: new Prisma.Decimal('100.000'),
            unit: 'kg',
            unitPrice: new Prisma.Decimal('60000'),
            totalPrice: new Prisma.Decimal('6000000'),
          },
        ],
      },
    },
  });
  await prisma.supplierPayment.create({
    data: {
      tenantId,
      supplierId: supplier.id,
      amount: new Prisma.Decimal('2000000'),
      method: 'TRANSFER',
      paymentDate: latePrevMonth,
      recordedByUserId: accountantUser.id,
      allocations: {
        create: [{ purchaseId: purchase.id, amount: new Prisma.Decimal('2000000') }],
      },
    },
  });

  // --- Expenses (workflow states) ---
  await prisma.expenseApproval.deleteMany({ where: { tenantId } });
  await prisma.expense.deleteMany({ where: { tenantId } });

  const transport =
    (await prisma.expenseCategory.findFirst({
      where: { tenantId, name: { in: ['Transport', 'Transport'] }, deletedAt: null },
    })) ??
    (await prisma.expenseCategory.findFirstOrThrow({
      where: { tenantId, deletedAt: null },
    }));
  const materialsCat =
    (await prisma.expenseCategory.findFirst({
      where: {
        tenantId,
        name: { in: ['Materials', 'Materiallar'] },
        deletedAt: null,
      },
    })) ?? transport;

  // Paid expense (full flow last month)
  const paidExpense = await prisma.expense.create({
    data: {
      tenantId,
      factoryId: factory.id,
      categoryId: transport.id,
      amount: new Prisma.Decimal('450000'),
      reason: 'Yetkazib berish transport xarajati (o‘tgan oy)',
      status: 'PAID',
      requestedByUserId: manager.id,
      approvedByUserId: owner.id,
      paidByUserId: accountantUser.id,
      requestedAt: midPrevMonth,
      approvedAt: midPrevMonth,
      paidAt: latePrevMonth,
    },
  });
  await prisma.expenseApproval.createMany({
    data: [
      {
        tenantId,
        expenseId: paidExpense.id,
        action: 'REQUESTED',
        actorUserId: manager.id,
        createdAt: midPrevMonth,
      },
      {
        tenantId,
        expenseId: paidExpense.id,
        action: 'APPROVED',
        actorUserId: owner.id,
        createdAt: midPrevMonth,
      },
      {
        tenantId,
        expenseId: paidExpense.id,
        action: 'PAID',
        actorUserId: accountantUser.id,
        createdAt: latePrevMonth,
      },
    ],
  });

  // Approved, waiting pay
  const approvedExpense = await prisma.expense.create({
    data: {
      tenantId,
      factoryId: factory.id,
      categoryId: materialsCat.id,
      amount: new Prisma.Decimal('320000'),
      reason: 'Qadoqlash materiallari (joriy oy)',
      status: 'APPROVED',
      requestedByUserId: manager.id,
      approvedByUserId: owner.id,
      requestedAt: daysAgo(5),
      approvedAt: daysAgo(4),
    },
  });
  await prisma.expenseApproval.createMany({
    data: [
      {
        tenantId,
        expenseId: approvedExpense.id,
        action: 'REQUESTED',
        actorUserId: manager.id,
      },
      {
        tenantId,
        expenseId: approvedExpense.id,
        action: 'APPROVED',
        actorUserId: owner.id,
      },
    ],
  });

  // Requested, waiting manager/owner
  const requestedExpense = await prisma.expense.create({
    data: {
      tenantId,
      factoryId: factory.id,
      categoryId: transport.id,
      amount: new Prisma.Decimal('180000'),
      reason: 'Mijozga yetkazish (kutilmoqda)',
      status: 'REQUESTED',
      requestedByUserId: sellerUser.id,
      requestedAt: daysAgo(1),
    },
  });
  await prisma.expenseApproval.create({
    data: {
      tenantId,
      expenseId: requestedExpense.id,
      action: 'REQUESTED',
      actorUserId: sellerUser.id,
    },
  });

  // --- Adjustments: advances with real workflow + bonus/penalty ---
  await prisma.employeeAdjustment.deleteMany({
    where: { tenantId, factoryId: factory.id },
  });

  // Previous month: advance fully paid (used in closed payroll)
  await prisma.employeeAdjustment.create({
    data: {
      tenantId,
      factoryId: factory.id,
      employeeId: vali.id,
      type: 'ADVANCE',
      amount: new Prisma.Decimal('80000'),
      reason: 'O‘tgan oy avans (to‘langan)',
      status: 'PAID',
      requestedByUserId: manager.id,
      approvedByUserId: owner.id,
      paidByUserId: accountantUser.id,
      requestedAt: midPrevMonth,
      approvedAt: midPrevMonth,
      paidAt: latePrevMonth,
    },
  });
  await prisma.employeeAdjustment.create({
    data: {
      tenantId,
      factoryId: factory.id,
      employeeId: ali.id,
      type: 'BONUS',
      amount: new Prisma.Decimal('100000'),
      reason: 'O‘tgan oy yaxshi ishlab chiqarish',
      status: 'APPROVED',
      requestedByUserId: owner.id,
      approvedByUserId: owner.id,
      requestedAt: latePrevMonth,
      approvedAt: latePrevMonth,
    },
  });

  // Current month advances — different workflow states
  await prisma.employeeAdjustment.create({
    data: {
      tenantId,
      factoryId: factory.id,
      employeeId: ali.id,
      type: 'ADVANCE',
      amount: new Prisma.Decimal('50000'),
      reason: 'Joriy oy avans so‘rovi (manager tasdiqini kutmoqda)',
      status: 'REQUESTED',
      requestedByUserId: manager.id,
      requestedAt: daysAgo(2),
    },
  });
  await prisma.employeeAdjustment.create({
    data: {
      tenantId,
      factoryId: factory.id,
      employeeId: dilshod.id,
      type: 'ADVANCE',
      amount: new Prisma.Decimal('60000'),
      reason: 'Manager tasdiqlagan, buxgalter to‘lovini kutmoqda',
      status: 'APPROVED',
      requestedByUserId: manager.id,
      approvedByUserId: owner.id,
      requestedAt: daysAgo(6),
      approvedAt: daysAgo(5),
    },
  });
  await prisma.employeeAdjustment.create({
    data: {
      tenantId,
      factoryId: factory.id,
      employeeId: sardor.id,
      type: 'ADVANCE',
      amount: new Prisma.Decimal('40000'),
      reason: 'To‘liq oqim: so‘rov → owner tasdiq → accountant to‘lov',
      status: 'PAID',
      requestedByUserId: manager.id,
      approvedByUserId: owner.id,
      paidByUserId: accountantUser.id,
      requestedAt: daysAgo(10),
      approvedAt: daysAgo(9),
      paidAt: daysAgo(8),
    },
  });
  await prisma.employeeAdjustment.create({
    data: {
      tenantId,
      factoryId: factory.id,
      employeeId: vali.id,
      type: 'PENALTY',
      amount: new Prisma.Decimal('15000'),
      reason: 'Kechikish (joriy oy)',
      status: 'APPROVED',
      requestedByUserId: manager.id,
      approvedByUserId: manager.id,
      requestedAt: daysAgo(4),
      approvedAt: daysAgo(4),
    },
  });

  // --- Payroll previous month CLOSED ---
  await prisma.payrollPayment.deleteMany({
    where: { payrollItem: { tenantId, factoryId: factory.id } },
  });
  await prisma.payrollItem.deleteMany({ where: { tenantId, factoryId: factory.id } });
  await prisma.payrollPeriod.deleteMany({ where: { tenantId, factoryId: factory.id } });

  // Ali prev: 800*120 = 96000 + bonus 100000 = 196000, paid full
  // Vali prev: 700*80 = 56000 - advance 80000 → final 0 (or negative capped 0) demo: advance 80000, worked 56000 → final 0
  // Dilshod: 650*60 = 39000
  // Sardor: 500*50 = 25000
  const prevTotals = {
    worked: new Prisma.Decimal('216000'), // 96000+56000+39000+25000
    bonus: new Prisma.Decimal('100000'),
    penalty: new Prisma.Decimal('0'),
    advance: new Prisma.Decimal('80000'),
    final: new Prisma.Decimal('236000'), // 96000+100000 + 0 + 39000 + 25000
    paid: new Prisma.Decimal('236000'),
  };

  const prevPayroll = await prisma.payrollPeriod.create({
    data: {
      tenantId,
      factoryId: factory.id,
      month: previousMonth,
      status: 'CLOSED',
      totalWorkedAmount: prevTotals.worked,
      totalBonusAmount: prevTotals.bonus,
      totalPenaltyAmount: prevTotals.penalty,
      totalAdvanceAmount: prevTotals.advance,
      totalFinalAmount: prevTotals.final,
      totalPaidAmount: prevTotals.paid,
      totalRemainingAmount: new Prisma.Decimal('0'),
      calculatedAt: latePrevMonth,
      closedAt: addMonths(previousMonth, 1),
    },
  });

  const prevItems = [
    {
      employeeId: ali.id,
      worked: '96000',
      bonus: '100000',
      penalty: '0',
      advance: '0',
      final: '196000',
      paid: '196000',
    },
    {
      employeeId: vali.id,
      worked: '56000',
      bonus: '0',
      penalty: '0',
      advance: '80000',
      final: '0',
      paid: '0',
    },
    {
      employeeId: dilshod.id,
      worked: '39000',
      bonus: '0',
      penalty: '0',
      advance: '0',
      final: '39000',
      paid: '39000',
    },
    {
      employeeId: sardor.id,
      worked: '25000',
      bonus: '0',
      penalty: '0',
      advance: '0',
      final: '25000',
      paid: '25000',
    },
  ];

  for (const item of prevItems) {
    const row = await prisma.payrollItem.create({
      data: {
        tenantId,
        factoryId: factory.id,
        payrollPeriodId: prevPayroll.id,
        employeeId: item.employeeId,
        workedAmount: new Prisma.Decimal(item.worked),
        bonusAmount: new Prisma.Decimal(item.bonus),
        penaltyAmount: new Prisma.Decimal(item.penalty),
        advanceAmount: new Prisma.Decimal(item.advance),
        finalAmount: new Prisma.Decimal(item.final),
        paidAmount: new Prisma.Decimal(item.paid),
        remainingAmount: new Prisma.Decimal('0'),
        status: 'PAID',
        calculationSnapshot: {
          source: 'demo-seed',
          month: 'previous',
          note: 'O‘tgan oy yopilgan ish haqi',
        },
      },
    });
    if (Number(item.paid) > 0) {
      await prisma.payrollPayment.create({
        data: {
          tenantId,
          payrollItemId: row.id,
          amount: new Prisma.Decimal(item.paid),
          method: 'CASH',
          paidAt: addMonths(previousMonth, 1),
          paidByUserId: accountantUser.id,
          note: 'O‘tgan oy ish haqi to‘lovi',
        },
      });
    }
  }

  // --- Payroll current month CALCULATED, partially paid ---
  // Ali: (420+300)*120 = 86400
  // Vali: 360*80 = 28800 - penalty 15000 = ... advance REQUESTED not in payroll
  // Dilshod: 250*60 = 15000; advance APPROVED may count if CALCULATED includes APPROVED
  // Sardor: 200*50 = 10000 - advance PAID 40000 → final may be 0
  // For demo snapshot use clear numbers matching UI expectations
  const currPayroll = await prisma.payrollPeriod.create({
    data: {
      tenantId,
      factoryId: factory.id,
      month: currentMonth,
      status: 'PARTIALLY_PAID',
      totalWorkedAmount: new Prisma.Decimal('140200'), // 86400+28800+15000+10000
      totalBonusAmount: new Prisma.Decimal('0'),
      totalPenaltyAmount: new Prisma.Decimal('15000'),
      totalAdvanceAmount: new Prisma.Decimal('40000'), // only PAID advance (sardor)
      totalFinalAmount: new Prisma.Decimal('100200'),
      totalPaidAmount: new Prisma.Decimal('50000'),
      totalRemainingAmount: new Prisma.Decimal('50200'),
      calculatedAt: daysAgo(1),
    },
  });

  const aliCurr = await prisma.payrollItem.create({
    data: {
      tenantId,
      factoryId: factory.id,
      payrollPeriodId: currPayroll.id,
      employeeId: ali.id,
      workedAmount: new Prisma.Decimal('86400'),
      bonusAmount: new Prisma.Decimal('0'),
      penaltyAmount: new Prisma.Decimal('0'),
      advanceAmount: new Prisma.Decimal('0'),
      finalAmount: new Prisma.Decimal('86400'),
      paidAmount: new Prisma.Decimal('50000'),
      remainingAmount: new Prisma.Decimal('36400'),
      status: 'PARTIALLY_PAID',
      calculationSnapshot: {
        source: 'demo-seed',
        month: 'current',
        activities: '720 dona × 120',
      },
    },
  });
  await prisma.payrollItem.create({
    data: {
      tenantId,
      factoryId: factory.id,
      payrollPeriodId: currPayroll.id,
      employeeId: vali.id,
      workedAmount: new Prisma.Decimal('28800'),
      bonusAmount: new Prisma.Decimal('0'),
      penaltyAmount: new Prisma.Decimal('15000'),
      advanceAmount: new Prisma.Decimal('0'),
      finalAmount: new Prisma.Decimal('13800'),
      paidAmount: new Prisma.Decimal('0'),
      remainingAmount: new Prisma.Decimal('13800'),
      status: 'CALCULATED',
      calculationSnapshot: {
        source: 'demo-seed',
        month: 'current',
        note: 'Jarima ayirilgan; avans hali REQUESTED',
      },
    },
  });
  await prisma.payrollItem.create({
    data: {
      tenantId,
      factoryId: factory.id,
      payrollPeriodId: currPayroll.id,
      employeeId: dilshod.id,
      workedAmount: new Prisma.Decimal('15000'),
      bonusAmount: new Prisma.Decimal('0'),
      penaltyAmount: new Prisma.Decimal('0'),
      advanceAmount: new Prisma.Decimal('0'),
      finalAmount: new Prisma.Decimal('15000'),
      paidAmount: new Prisma.Decimal('0'),
      remainingAmount: new Prisma.Decimal('15000'),
      status: 'CALCULATED',
      calculationSnapshot: {
        source: 'demo-seed',
        month: 'current',
        note: 'Avans APPROVED lekin hali to‘lanmagan — ish haqidan ayirilmagan',
      },
    },
  });
  await prisma.payrollItem.create({
    data: {
      tenantId,
      factoryId: factory.id,
      payrollPeriodId: currPayroll.id,
      employeeId: sardor.id,
      workedAmount: new Prisma.Decimal('10000'),
      bonusAmount: new Prisma.Decimal('0'),
      penaltyAmount: new Prisma.Decimal('0'),
      advanceAmount: new Prisma.Decimal('40000'),
      finalAmount: new Prisma.Decimal('0'),
      paidAmount: new Prisma.Decimal('0'),
      remainingAmount: new Prisma.Decimal('0'),
      status: 'PAID',
      calculationSnapshot: {
        source: 'demo-seed',
        month: 'current',
        note: 'To‘langan avans ish haqidan oshib ketgan',
      },
    },
  });

  await prisma.payrollPayment.create({
    data: {
      tenantId,
      payrollItemId: aliCurr.id,
      amount: new Prisma.Decimal('50000'),
      method: 'CASH',
      paidAt: daysAgo(1),
      paidByUserId: accountantUser.id,
      note: 'Joriy oy qisman ish haqi (Ali)',
    },
  });

  console.log('Paypoq OS full 2-month demo seed completed.');
  console.log('');
  console.log('Demo logins (password: ChangeMe123!):');
  console.log('  owner@paypoq.local       — korxona egasi');
  console.log('  manager@paypoq.local     — menejer (avans/xarajat tasdiq)');
  console.log('  seller@paypoq.local      — sotuv + ombor ko‘rish');
  console.log('  warehouse@paypoq.local   — ombor');
  console.log('  shift@paypoq.local       — ishlab chiqarish');
  console.log('  accountant@paypoq.local  — moliya / ish haqi');
  console.log('  platform@paypoq.local    — super admin');
  console.log('');
  console.log('Avans holatlari:');
  console.log('  Ali — REQUESTED (manager/owner tasdiq kutmoqda)');
  console.log('  Dilshod — APPROVED (to‘lov kutmoqda)');
  console.log('  Sardor — PAID (to‘liq oqim)');
  console.log('  Vali — o‘tgan oy PAID + joriy oy jarima');
}

async function findColor(tenantId: string, name: string) {
  return prisma.color.findFirstOrThrow({ where: { tenantId, name, deletedAt: null } });
}

async function findMaterial(tenantId: string, name: string) {
  return prisma.material.findFirstOrThrow({ where: { tenantId, name, deletedAt: null } });
}

async function findSeason(tenantId: string, name: string) {
  return prisma.season.findFirstOrThrow({ where: { tenantId, name, deletedAt: null } });
}

async function upsertVariant(
  tenantId: string,
  productId: string,
  colorId: string,
  materialId: string,
  seasonId: string,
) {
  return prisma.productVariant.upsert({
    where: {
      tenantId_productId_colorId_materialId_seasonId: {
        tenantId,
        productId,
        colorId,
        materialId,
        seasonId,
      },
    },
    create: { tenantId, productId, colorId, materialId, seasonId },
    update: { deletedAt: null },
  });
}

function requireStage(stageMap: Map<string, { id: string }>, name: string) {
  const stage = stageMap.get(name);
  if (!stage) throw new Error(`Missing production stage: ${name}`);
  return stage;
}

function inv(
  tenantId: string,
  factoryId: string,
  stageMap: Map<string, { id: string }>,
  stageName: string,
  productVariantId: string,
  quantity: number,
) {
  return {
    tenantId,
    factoryId,
    productionStageId: requireStage(stageMap, stageName).id,
    productVariantId,
    quantity,
  };
}

function mov(
  tenantId: string,
  factoryId: string,
  stageMap: Map<string, { id: string }>,
  userId: string,
  batchId: string,
  sourceName: string,
  destinationName: string,
  productVariantId: string,
  quantity: number,
  occurredAt: Date,
) {
  return {
    tenantId,
    factoryId,
    sourceStageId: requireStage(stageMap, sourceName).id,
    destinationStageId: requireStage(stageMap, destinationName).id,
    productVariantId,
    productionBatchId: batchId,
    quantity,
    recordedByUserId: userId,
    occurredAt,
    note: 'Demo movement',
  };
}

function act(
  tenantId: string,
  factoryId: string,
  stageMap: Map<string, { id: string }>,
  enteredByUserId: string,
  employeeId: string,
  stageName: string,
  productVariantId: string,
  quantity: number,
  rate: string,
  activityDate: Date,
) {
  return {
    tenantId,
    factoryId,
    employeeId,
    productionStageId: requireStage(stageMap, stageName).id,
    productVariantId,
    quantity,
    salaryRateAmount: new Prisma.Decimal(rate),
    activityDate,
    enteredByUserId,
  };
}

function sm(
  tenantId: string,
  factoryId: string,
  warehouse: { id: string },
  zoneId: string,
  userId: string,
  itemType: 'PRODUCT' | 'MATERIAL',
  movementType: 'RECEIPT' | 'PRODUCTION_RECEIPT',
  productVariantId: string | null,
  materialId: string | null,
  quantity: string,
  unit: string,
  occurredAt: Date,
) {
  return {
    tenantId,
    factoryId,
    warehouseId: warehouse.id,
    warehouseZoneId: zoneId,
    itemType,
    movementType,
    productVariantId,
    materialId,
    quantity: new Prisma.Decimal(quantity),
    unit,
    beforeQuantity: new Prisma.Decimal('0'),
    afterQuantity: new Prisma.Decimal(quantity),
    reason: 'Demo seed',
    note: 'Demo data',
    recordedByUserId: userId,
    occurredAt,
  };
}

main()
  .catch((error) => {
    console.error('Paypoq OS demo seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
