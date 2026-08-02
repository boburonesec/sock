/**
 * Empty bootstrap seed: ONLY platform super-admin.
 * No tenants, factories, or factory users.
 *
 * After wipe, operator creates everything from /admin.
 */
import { createPrismaClient } from '../src/prisma/client';
import * as argon2 from 'argon2';

const prisma = createPrismaClient();

const PLATFORM_ADMIN_EMAIL = 'platform@paypoq.local';
const PLATFORM_PASSWORD = 'ChangeMe123!';

async function main(): Promise<void> {
  const platformAdmin = await prisma.platformAdmin.upsert({
    where: { email: PLATFORM_ADMIN_EMAIL },
    create: {
      email: PLATFORM_ADMIN_EMAIL,
      name: 'Platform Admin',
      status: 'ACTIVE',
    },
    update: {
      name: 'Platform Admin',
      status: 'ACTIVE',
      deletedAt: null,
    },
  });

  const passwordHash = await argon2.hash(PLATFORM_PASSWORD);

  await prisma.platformAdminCredential.upsert({
    where: { platformAdminId: platformAdmin.id },
    create: {
      platformAdminId: platformAdmin.id,
      passwordHash,
    },
    update: {
      passwordHash,
      passwordUpdatedAt: new Date(),
    },
  });

  console.log('Empty bootstrap completed.');
  console.log('Only platform admin exists. No tenants/factories.');
  console.log(`Admin login: ${PLATFORM_ADMIN_EMAIL} / ${PLATFORM_PASSWORD}`);
  console.log('Open: /admin/login → create tenant + owner from zero.');
}

main()
  .catch((error) => {
    console.error('Empty seed failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
