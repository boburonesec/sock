import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function assertResetAllowed() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const databaseUrl = process.env.DATABASE_URL ?? '';

  if (process.env.ALLOW_DEMO_RESET !== 'true') {
    throw new Error('Refusing demo reset. Set ALLOW_DEMO_RESET=true explicitly.');
  }

  if (nodeEnv === 'production') {
    throw new Error('Refusing demo reset while NODE_ENV=production.');
  }

  if (!databaseUrl) {
    throw new Error('Refusing demo reset because DATABASE_URL is missing.');
  }

  let parsed;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('Refusing demo reset because DATABASE_URL is invalid.');
  }

  const host = parsed.hostname.toLowerCase();
  const databaseName = parsed.pathname.replace(/^\//, '').toLowerCase();
  const safeHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.local');
  const safeDatabaseName =
    databaseName.includes('demo') ||
    databaseName.includes('test') ||
    databaseName.includes('dev') ||
    databaseName === 'paypoq_os';

  if (!safeHost || !safeDatabaseName) {
    throw new Error(
      `Refusing demo reset for non-local/non-demo database: host=${host}, database=${databaseName}`,
    );
  }
}

async function main() {
  assertResetAllowed();

  const tables = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename ASC
  `;

  if (!tables.length) {
    console.log('No application tables found to reset.');
    return;
  }

  const tableList = tables
    .map((row) => `"public"."${String(row.tablename).replaceAll('"', '""')}"`)
    .join(', ');

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);

  console.log(`Demo reset completed. Truncated ${tables.length} application tables.`);
}

main()
  .catch((error) => {
    console.error('Demo reset failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
