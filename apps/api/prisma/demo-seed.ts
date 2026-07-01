import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_TENANT_ID = 'seed-demo-paypoq-factory';

const now = new Date();
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: DEMO_TENANT_ID },
  });

  if (!tenant) {
    throw new Error('Baseline tenant not found. Run baseline seed before demo seed.');
  }

  const tenantId = tenant.id;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'ACTIVE',
      subscriptionStatus: 'TRIAL',
      planCode: 'pilot',
      contactName: 'Demo Owner',
      contactPhone: '+998 90 000 00 00',
      contactEmail: 'owner@paypoq.local',
      notes: 'Demo/pilot database prepared by demo seed.',
    },
  });

  const factory = await prisma.factory.findFirstOrThrow({
    where: { tenantId: tenant.id, name: 'Main Factory', deletedAt: null },
  });
  const warehouse = await prisma.warehouse.findFirstOrThrow({
    where: { tenantId: tenant.id, factoryId: factory.id, name: 'Main Warehouse' },
  });
  const finishedZone = await prisma.warehouseZone.findFirstOrThrow({
    where: { tenantId: tenant.id, warehouseId: warehouse.id, name: 'Finished Products' },
  });
  const rawZone = await prisma.warehouseZone.findFirstOrThrow({
    where: { tenantId: tenant.id, warehouseId: warehouse.id, name: 'Raw Materials' },
  });
  const owner = await prisma.user.findFirstOrThrow({
    where: { tenantId: tenant.id, email: 'owner@paypoq.local' },
  });
  const warehouseUser = await prisma.user.findFirstOrThrow({
    where: { tenantId: tenant.id, email: 'warehouse@paypoq.local' },
  });
  const shiftUser = await prisma.user.findFirstOrThrow({
    where: { tenantId: tenant.id, email: 'shift@paypoq.local' },
  });
  const sellerUser = await prisma.user.findFirstOrThrow({
    where: { tenantId: tenant.id, email: 'seller@paypoq.local' },
  });
  const accountantUser = await prisma.user.findFirstOrThrow({
    where: { tenantId: tenant.id, email: 'accountant@paypoq.local' },
  });

  const stages = await prisma.productionStage.findMany({
    where: { tenantId: tenant.id, factoryId: factory.id, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
  });
  const stageByName = new Map(stages.map((stage) => [stage.name, stage]));

  const black = await findColor('Qora');
  const white = await findColor('Oq');
  const cotton = await findMaterial('Paxta');
  const bamboo = await findMaterial('Bamboo');
  const universal = await findSeason('Universal');
  const summer = await findSeason('Yozgi');

  const classic = await prisma.product.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Classic Paypoq' } },
    create: { tenantId: tenant.id, name: 'Classic Paypoq', code: 'CLS' },
    update: { deletedAt: null },
  });
  const sport = await prisma.product.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Sport Paypoq' } },
    create: { tenantId: tenant.id, name: 'Sport Paypoq', code: 'SPT' },
    update: { deletedAt: null },
  });

  const classicBlack = await upsertVariant(classic.id, black.id, cotton.id, universal.id);
  const sportWhite = await upsertVariant(sport.id, white.id, bamboo.id, summer.id);

  await prisma.productPrice.deleteMany({
    where: { tenantId: tenant.id, productId: { in: [classic.id, sport.id] } },
  });
  await prisma.productPrice.createMany({
    data: [
      {
        tenantId: tenant.id,
        productId: classic.id,
        productVariantId: classicBlack.id,
        amount: new Prisma.Decimal('12000'),
        effectiveFrom: monthStart,
      },
      {
        tenantId: tenant.id,
        productId: sport.id,
        productVariantId: sportWhite.id,
        amount: new Prisma.Decimal('15000'),
        effectiveFrom: monthStart,
      },
    ],
  });

  const employees = await Promise.all(
    ['Ali Averlogchi', 'Vali Dazmolchi', 'Dilshod Sifat nazorati'].map((name) =>
      prisma.employee.create({
        data: {
          tenantId: tenant.id,
          factoryId: factory.id,
          name,
          status: 'ACTIVE',
        },
      }),
    ),
  );

  await prisma.salaryRate.createMany({
    data: [
      {
        tenantId: tenant.id,
        factoryId: factory.id,
        productionStageId: requireStage(stageByName, 'Averlog').id,
        productVariantId: classicBlack.id,
        amount: new Prisma.Decimal('120'),
        effectiveFrom: monthStart,
      },
      {
        tenantId: tenant.id,
        factoryId: factory.id,
        productionStageId: requireStage(stageByName, 'Dazmol').id,
        amount: new Prisma.Decimal('80'),
        effectiveFrom: monthStart,
      },
      {
        tenantId: tenant.id,
        factoryId: factory.id,
        productionStageId: requireStage(stageByName, 'Sifat').id,
        amount: new Prisma.Decimal('60'),
        effectiveFrom: monthStart,
      },
    ],
  });

  await prisma.stageInventory.createMany({
    data: [
      stageInventory(tenant.id, factory.id, 'Averlog', classicBlack.id, 650, stageByName),
      stageInventory(tenant.id, factory.id, 'Dazmol', classicBlack.id, 920, stageByName),
      stageInventory(tenant.id, factory.id, 'Sifat', classicBlack.id, 310, stageByName),
      stageInventory(tenant.id, factory.id, 'Qadoqlash', sportWhite.id, 240, stageByName),
      stageInventory(tenant.id, factory.id, 'Ombor', classicBlack.id, 420, stageByName),
    ],
  });

  const batch = await prisma.productionBatch.create({
    data: {
      tenantId: tenant.id,
      factoryId: factory.id,
      productVariantId: classicBlack.id,
      quantity: 500,
      createdByUserId: shiftUser.id,
    },
  });

  await prisma.stageMovement.createMany({
    data: [
      movement('Averlog', 'Dazmol', classicBlack.id, 500),
      movement('Dazmol', 'Sifat', classicBlack.id, 280),
      movement('Qadoqlash', 'Ombor', sportWhite.id, 180),
    ],
  });

  await prisma.workerActivity.createMany({
    data: [
      workerActivity(employees[0].id, 'Averlog', classicBlack.id, 420, '120'),
      workerActivity(employees[1].id, 'Dazmol', classicBlack.id, 360, '80'),
      workerActivity(employees[2].id, 'Sifat', classicBlack.id, 250, '60'),
      workerActivity(employees[0].id, 'Averlog', classicBlack.id, 300, '120', yesterday),
    ],
  });

  await prisma.defect.create({
    data: {
      tenantId: tenant.id,
      factoryId: factory.id,
      employeeId: employees[2].id,
      productionStageId: requireStage(stageByName, 'Sifat').id,
      productVariantId: classicBlack.id,
      quantity: 8,
      reason: 'Tikuv sifati past',
      reportedByUserId: shiftUser.id,
      detectedAt: now,
    },
  });

  await prisma.stock.createMany({
    data: [
      {
        tenantId: tenant.id,
        factoryId: factory.id,
        warehouseId: warehouse.id,
        warehouseZoneId: finishedZone.id,
        productVariantId: classicBlack.id,
        quantity: 1250,
      },
      {
        tenantId: tenant.id,
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
        tenantId: tenant.id,
        factoryId: factory.id,
        warehouseId: warehouse.id,
        warehouseZoneId: rawZone.id,
        materialId: cotton.id,
        quantity: new Prisma.Decimal('35.500'),
        unit: 'kg',
      },
      {
        tenantId: tenant.id,
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
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        materialId: bamboo.id,
      },
    },
    create: {
      tenantId: tenant.id,
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
      stockMovement('PRODUCT', 'PRODUCTION_RECEIPT', classicBlack.id, null, '500', 'pcs', '0', '500'),
      stockMovement('MATERIAL', 'RECEIPT', null, cotton.id, '35.500', 'kg', '0', '35.500'),
      stockMovement('MATERIAL', 'RECEIPT', null, bamboo.id, '4.000', 'kg', '0', '4.000'),
    ],
  });

  const client = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      name: 'Andijon Savdo',
      phone: '+998 91 111 22 33',
      address: 'Andijon',
      status: 'ACTIVE',
    },
  });
  const paidOrder = await prisma.salesOrder.create({
    data: {
      tenantId: tenant.id,
      factoryId: factory.id,
      clientId: client.id,
      orderNumber: 'DEMO-ORD-001',
      status: 'DELIVERED',
      totalAmount: new Prisma.Decimal('1200000'),
      paymentStatus: 'PAID',
      createdByUserId: sellerUser.id,
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
  const openOrder = await prisma.salesOrder.create({
    data: {
      tenantId: tenant.id,
      factoryId: factory.id,
      clientId: client.id,
      orderNumber: 'DEMO-ORD-002',
      status: 'CONFIRMED',
      totalAmount: new Prisma.Decimal('750000'),
      paymentStatus: 'PARTIALLY_PAID',
      createdByUserId: sellerUser.id,
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
  const paymentOne = await prisma.clientPayment.create({
    data: {
      tenantId: tenant.id,
      clientId: client.id,
      amount: new Prisma.Decimal('1200000'),
      method: 'TRANSFER',
      paymentDate: now,
      recordedByUserId: sellerUser.id,
      allocations: {
        create: [{ orderId: paidOrder.id, amount: new Prisma.Decimal('1200000') }],
      },
    },
  });
  const paymentTwo = await prisma.clientPayment.create({
    data: {
      tenantId: tenant.id,
      clientId: client.id,
      amount: new Prisma.Decimal('250000'),
      method: 'CASH',
      paymentDate: now,
      recordedByUserId: sellerUser.id,
      allocations: {
        create: [{ orderId: openOrder.id, amount: new Prisma.Decimal('250000') }],
      },
    },
  });
  void paymentOne;
  void paymentTwo;

  const supplier = await prisma.supplier.create({
    data: {
      tenantId: tenant.id,
      name: 'Yarn Textile LLC',
      phone: '+998 93 222 33 44',
      status: 'ACTIVE',
    },
  });
  const purchase = await prisma.supplierPurchase.create({
    data: {
      tenantId: tenant.id,
      factoryId: factory.id,
      supplierId: supplier.id,
      purchaseNumber: 'DEMO-PUR-001',
      totalAmount: new Prisma.Decimal('3000000'),
      paymentStatus: 'PARTIALLY_PAID',
      purchasedAt: now,
      createdByUserId: accountantUser.id,
      items: {
        create: [
          {
            materialId: cotton.id,
            quantity: new Prisma.Decimal('50.000'),
            unit: 'kg',
            unitPrice: new Prisma.Decimal('60000'),
            totalPrice: new Prisma.Decimal('3000000'),
          },
        ],
      },
    },
  });
  await prisma.supplierPayment.create({
    data: {
      tenantId: tenant.id,
      supplierId: supplier.id,
      amount: new Prisma.Decimal('1000000'),
      method: 'TRANSFER',
      paymentDate: now,
      recordedByUserId: accountantUser.id,
      allocations: {
        create: [{ purchaseId: purchase.id, amount: new Prisma.Decimal('1000000') }],
      },
    },
  });

  const expenseCategory = await prisma.expenseCategory.findFirstOrThrow({
    where: { tenantId: tenant.id, name: 'Transport' },
  });
  await prisma.expense.create({
    data: {
      tenantId: tenant.id,
      factoryId: factory.id,
      categoryId: expenseCategory.id,
      amount: new Prisma.Decimal('450000'),
      reason: 'Yetkazib berish transport xarajati',
      status: 'PAID',
      requestedByUserId: owner.id,
      approvedByUserId: owner.id,
      paidByUserId: accountantUser.id,
      requestedAt: now,
      approvedAt: now,
      paidAt: now,
    },
  });

  await prisma.employeeAdjustment.createMany({
    data: [
      {
        tenantId: tenant.id,
        factoryId: factory.id,
        employeeId: employees[0].id,
        type: 'BONUS',
        amount: new Prisma.Decimal('100000'),
        reason: 'Yaxshi ishlab chiqarish',
        status: 'APPLIED',
        requestedByUserId: owner.id,
        approvedByUserId: owner.id,
        requestedAt: now,
        approvedAt: now,
      },
      {
        tenantId: tenant.id,
        factoryId: factory.id,
        employeeId: employees[1].id,
        type: 'ADVANCE',
        amount: new Prisma.Decimal('50000'),
        reason: 'Avans',
        status: 'APPLIED',
        requestedByUserId: owner.id,
        approvedByUserId: owner.id,
        paidByUserId: accountantUser.id,
        requestedAt: now,
        approvedAt: now,
        paidAt: now,
      },
    ],
  });

  const payroll = await prisma.payrollPeriod.create({
    data: {
      tenantId: tenant.id,
      factoryId: factory.id,
      month: monthStart,
      status: 'PARTIALLY_PAID',
      totalWorkedAmount: new Prisma.Decimal('79800'),
      totalBonusAmount: new Prisma.Decimal('100000'),
      totalPenaltyAmount: new Prisma.Decimal('0'),
      totalAdvanceAmount: new Prisma.Decimal('50000'),
      totalFinalAmount: new Prisma.Decimal('129800'),
      totalPaidAmount: new Prisma.Decimal('50000'),
      totalRemainingAmount: new Prisma.Decimal('79800'),
      calculatedAt: now,
    },
  });
  const firstPayrollItem = await prisma.payrollItem.create({
    data: {
      tenantId: tenant.id,
      factoryId: factory.id,
      payrollPeriodId: payroll.id,
      employeeId: employees[0].id,
      workedAmount: new Prisma.Decimal('50400'),
      bonusAmount: new Prisma.Decimal('100000'),
      penaltyAmount: new Prisma.Decimal('0'),
      advanceAmount: new Prisma.Decimal('0'),
      finalAmount: new Prisma.Decimal('150400'),
      paidAmount: new Prisma.Decimal('50000'),
      remainingAmount: new Prisma.Decimal('100400'),
      status: 'PARTIALLY_PAID',
      calculationSnapshot: { source: 'demo-seed' },
    },
  });
  await prisma.payrollItem.create({
    data: {
      tenantId: tenant.id,
      factoryId: factory.id,
      payrollPeriodId: payroll.id,
      employeeId: employees[1].id,
      workedAmount: new Prisma.Decimal('28800'),
      bonusAmount: new Prisma.Decimal('0'),
      penaltyAmount: new Prisma.Decimal('0'),
      advanceAmount: new Prisma.Decimal('50000'),
      finalAmount: new Prisma.Decimal('0'),
      paidAmount: new Prisma.Decimal('0'),
      remainingAmount: new Prisma.Decimal('0'),
      status: 'PAID',
      calculationSnapshot: { source: 'demo-seed' },
    },
  });
  await prisma.payrollPayment.create({
    data: {
      tenantId: tenant.id,
      payrollItemId: firstPayrollItem.id,
      amount: new Prisma.Decimal('50000'),
      method: 'CASH',
      paidAt: now,
      paidByUserId: accountantUser.id,
      note: 'Demo partial payroll payment',
    },
  });

  console.log('Paypoq OS demo seed completed.');

  async function findColor(name: string) {
    return prisma.color.findFirstOrThrow({ where: { tenantId, name, deletedAt: null } });
  }

  async function findMaterial(name: string) {
    return prisma.material.findFirstOrThrow({ where: { tenantId, name, deletedAt: null } });
  }

  async function findSeason(name: string) {
    return prisma.season.findFirstOrThrow({ where: { tenantId, name, deletedAt: null } });
  }

  async function upsertVariant(productId: string, colorId: string, materialId: string, seasonId: string) {
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

  function stageInventory(
    tenantId: string,
    factoryId: string,
    stageName: string,
    productVariantId: string,
    quantity: number,
    stageMap: Map<string, { id: string }>,
  ) {
    return {
      tenantId,
      factoryId,
      productionStageId: requireStage(stageMap, stageName).id,
      productVariantId,
      quantity,
    };
  }

  function movement(sourceName: string, destinationName: string, productVariantId: string, quantity: number) {
    return {
      tenantId,
      factoryId: factory.id,
      sourceStageId: requireStage(stageByName, sourceName).id,
      destinationStageId: requireStage(stageByName, destinationName).id,
      productVariantId,
      productionBatchId: batch.id,
      quantity,
      recordedByUserId: shiftUser.id,
      occurredAt: now,
      note: 'Demo movement',
    };
  }

  function workerActivity(
    employeeId: string,
    stageName: string,
    productVariantId: string,
    quantity: number,
    rate: string,
    date = now,
  ) {
    return {
      tenantId,
      factoryId: factory.id,
      employeeId,
      productionStageId: requireStage(stageByName, stageName).id,
      productVariantId,
      quantity,
      salaryRateAmount: new Prisma.Decimal(rate),
      activityDate: date,
      enteredByUserId: shiftUser.id,
    };
  }

  function stockMovement(
    itemType: 'PRODUCT' | 'MATERIAL',
    movementType: 'RECEIPT' | 'PRODUCTION_RECEIPT',
    productVariantId: string | null,
    materialId: string | null,
    quantity: string,
    unit: string,
    beforeQuantity: string,
    afterQuantity: string,
  ) {
    return {
      tenantId,
      factoryId: factory.id,
      warehouseId: warehouse.id,
      warehouseZoneId: itemType === 'PRODUCT' ? finishedZone.id : rawZone.id,
      itemType,
      movementType,
      productVariantId,
      materialId,
      quantity: new Prisma.Decimal(quantity),
      unit,
      beforeQuantity: new Prisma.Decimal(beforeQuantity),
      afterQuantity: new Prisma.Decimal(afterQuantity),
      reason: 'Demo seed',
      note: 'Demo data',
      recordedByUserId: warehouseUser.id,
      occurredAt: now,
    };
  }
}

function requireStage(stageMap: Map<string, { id: string }>, name: string) {
  const stage = stageMap.get(name);

  if (!stage) {
    throw new Error(`Missing production stage: ${name}`);
  }

  return stage;
}

main()
  .catch((error) => {
    console.error('Paypoq OS demo seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
