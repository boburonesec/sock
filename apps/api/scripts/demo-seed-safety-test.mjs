import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createScriptPrismaClient } from './prisma-client.mjs';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prisma = createScriptPrismaClient();
const demoTenantId = 'seed-demo-paypoq-factory';
const foreignTenantId = 'seed-safety-foreign-tenant';

function runDemoSeed(expectSuccess) {
  const result = spawnSync(
    'pnpm',
    ['demo:seed'],
    {
      cwd: apiRoot,
      env: { ...process.env, ALLOW_DEMO_SEED: 'true', NODE_ENV: 'test' },
      encoding: 'utf8',
    },
  );

  if (expectSuccess) {
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } else {
    assert.notEqual(result.status, 0, 'demo seed unexpectedly succeeded');
  }
}

async function main() {
  const demoFactory = await prisma.factory.findFirstOrThrow({
    where: { tenantId: demoTenantId, name: 'Main Factory', deletedAt: null },
  });
  const variant = await prisma.productVariant.findFirstOrThrow({
    where: { tenantId: demoTenantId, deletedAt: null },
  });
  const supplierPayment = await prisma.supplierPayment.findFirstOrThrow({
    where: { tenantId: demoTenantId },
  });
  const idempotencyKey = `seed-safety-${Date.now()}`;
  await prisma.supplierPaymentIdempotency.create({
    data: {
      tenantId: demoTenantId,
      factoryId: demoFactory.id,
      operation: 'CREATE_SUPPLIER_PAYMENT',
      key: idempotencyKey,
      requestFingerprint: 'seed-safety-fixture-cleanup',
      paymentId: supplierPayment.id,
    },
  });

  const siblingFactory = await prisma.factory.create({
    data: { tenantId: demoTenantId, name: 'Seed safety sibling factory' },
  });
  const siblingStage = await prisma.productionStage.create({
    data: {
      tenantId: demoTenantId,
      factoryId: siblingFactory.id,
      name: 'Seed safety stage',
      sortOrder: 999,
    },
  });
  const siblingInventory = await prisma.stageInventory.create({
    data: {
      tenantId: demoTenantId,
      factoryId: siblingFactory.id,
      productionStageId: siblingStage.id,
      productVariantId: variant.id,
      quantity: 777,
    },
  });

  await prisma.tenant.create({ data: { id: foreignTenantId, name: 'Seed safety foreign tenant' } });
  const foreignClient = await prisma.client.create({
    data: { tenantId: foreignTenantId, name: 'Seed safety foreign client' },
  });
  const foreignTelegram = await prisma.telegramAccount.create({
    data: {
      tenantId: foreignTenantId,
      telegramUserId: `seed-safety-${Date.now()}`,
      telegramChatId: 'seed-safety-chat',
      type: 'CLIENT',
      clientId: foreignClient.id,
    },
  });

  const activitiesBefore = await prisma.workerActivity.count({
    where: { tenantId: demoTenantId, factoryId: demoFactory.id },
  });
  const movementsBefore = await prisma.stageMovement.count({
    where: { tenantId: demoTenantId, factoryId: demoFactory.id },
  });

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION "seed_safety_reject_stage_movement_delete"()
    RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'seed safety forced rollback';
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER "seed_safety_stage_movement_delete"
    BEFORE DELETE ON "StageMovement"
    FOR EACH STATEMENT
    EXECUTE FUNCTION "seed_safety_reject_stage_movement_delete"();
  `);

  try {
    runDemoSeed(false);
  } finally {
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS "seed_safety_stage_movement_delete" ON "StageMovement";
      DROP FUNCTION IF EXISTS "seed_safety_reject_stage_movement_delete"();
    `);
  }

  assert.equal(
    await prisma.workerActivity.count({
      where: { tenantId: demoTenantId, factoryId: demoFactory.id },
    }),
    activitiesBefore,
    'production cleanup did not roll back worker-activity deletion',
  );
  assert.equal(
    await prisma.stageMovement.count({
      where: { tenantId: demoTenantId, factoryId: demoFactory.id },
    }),
    movementsBefore,
    'production cleanup changed movements after forced rollback',
  );

  runDemoSeed(true);

  assert.equal(
    await prisma.supplierPaymentIdempotency.count({
      where: { tenantId: demoTenantId, key: idempotencyKey },
    }),
    0,
    'demo cleanup left a supplier-payment idempotency record behind',
  );

  assert.equal(
    await prisma.stageInventory.count({ where: { id: siblingInventory.id } }),
    1,
    'demo cleanup deleted another factory inventory row',
  );
  assert.equal(
    await prisma.client.count({ where: { id: foreignClient.id } }),
    1,
    'demo cleanup deleted another tenant client',
  );
  assert.equal(
    await prisma.telegramAccount.count({ where: { id: foreignTelegram.id } }),
    1,
    'demo cleanup deleted another tenant Telegram account',
  );

  await prisma.stageInventory.delete({ where: { id: siblingInventory.id } });
  await prisma.productionStage.delete({ where: { id: siblingStage.id } });
  await prisma.factory.delete({ where: { id: siblingFactory.id } });
  await prisma.telegramAccount.delete({ where: { id: foreignTelegram.id } });
  await prisma.client.delete({ where: { id: foreignClient.id } });
  await prisma.tenant.delete({ where: { id: foreignTenantId } });

  console.log('demo seed safety: 6 passed, 0 failed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
