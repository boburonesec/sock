import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Baseline startup must not create tenants, users, credentials, or demo data.
  await prisma.$queryRaw`SELECT 1`;
  console.log('Baseline seed completed (no application data created).');
}

main()
  .catch((error) => {
    console.error('Baseline seed failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
