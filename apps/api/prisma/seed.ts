import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const DEMO_TENANT_ID = 'seed-demo-paypoq-factory';
const DEMO_PASSWORD = 'ChangeMe123!';
const PLATFORM_ADMIN_EMAIL = 'platform@paypoq.local';

const demoUsers = [
  {
    email: 'owner@paypoq.local',
    name: 'Demo Owner',
    role: 'Owner',
  },
  {
    email: 'manager@paypoq.local',
    name: 'Demo Manager',
    role: 'Manager',
  },
  {
    email: 'seller@paypoq.local',
    name: 'Demo Seller',
    role: 'Seller',
  },
  {
    email: 'warehouse@paypoq.local',
    name: 'Demo Warehouse Operator',
    role: 'Warehouse Operator',
  },
  {
    email: 'shift@paypoq.local',
    name: 'Demo Shift Receiver',
    role: 'Shift Receiver',
  },
  {
    email: 'accountant@paypoq.local',
    name: 'Demo Accountant',
    role: 'Accountant',
  },
] as const;

const permissionDefinitions = [
  'dashboard.view',
  'production.view',
  'production.write',
  'warehouse.view',
  'warehouse.write',
  'sales.view',
  'sales.write',
  'finance.view',
  'finance.write',
  'employees.view',
  'employees.write',
  'reports.view',
  'settings.view',
  'settings.write',
  'audit.view',
] as const;

const rolePermissions: Record<string, readonly string[]> = {
  Owner: permissionDefinitions,
  Manager: [
    'dashboard.view',
    'production.view',
    'production.write',
    'warehouse.view',
    'warehouse.write',
    'sales.view',
    'sales.write',
    'finance.view',
    'finance.write',
    'employees.view',
    'employees.write',
    'reports.view',
    'settings.view',
    'settings.write',
  ],
  Accountant: [
    'finance.view',
    'finance.write',
    'sales.view',
    'reports.view',
    'warehouse.view',
  ],
  Seller: ['sales.view', 'sales.write', 'warehouse.view'],
  'Warehouse Operator': ['warehouse.view', 'warehouse.write'],
  'Shift Receiver': ['production.view', 'production.write'],
};

const warehouseZoneNames = [
  'Finished Products',
  'Raw Materials',
  'Packaging',
  'Labels',
  'Defects',
] as const;

const productionStages = [
  'Averlog',
  'Dazmol',
  'Sifat',
  'Kiydirish',
  'Par Dazmol',
  'Parlash',
  'Bezak',
  'Etiketka',
  'Qadoqlash',
  'Ombor',
] as const;

const expenseCategoryNames = [
  'Transport',
  'Materiallar',
  'Qadoqlash',
  'Uskuna ta’miri',
  'Boshqa',
] as const;

const colorNames = ['Qora', 'Oq', 'Kulrang'] as const;
const materialNames = ['Paxta', 'Bamboo', 'Mixed'] as const;
const seasonNames = ['Qishki', 'Yozgi', 'Universal'] as const;

async function main(): Promise<void> {
  const platformAdmin = await prisma.platformAdmin.upsert({
    where: {
      email: PLATFORM_ADMIN_EMAIL,
    },
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

  // LOCAL DEVELOPMENT ONLY.
  // Platform auth is intentionally separate from tenant UserCredential.
  // Use argon2 defaults so future platform login endpoints can verify this
  // credential without project-specific hashing parameters.
  const platformPasswordHash = await argon2.hash(DEMO_PASSWORD);

  await prisma.platformAdminCredential.upsert({
    where: {
      platformAdminId: platformAdmin.id,
    },
    create: {
      platformAdminId: platformAdmin.id,
      passwordHash: platformPasswordHash,
    },
    update: {},
  });

  const tenant = await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    create: {
      id: DEMO_TENANT_ID,
      name: 'Demo Paypoq Factory',
    },
    update: {
      name: 'Demo Paypoq Factory',
      deletedAt: null,
    },
  });

  const factory = await prisma.factory.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'Main Factory',
      },
    },
    create: {
      tenantId: tenant.id,
      name: 'Main Factory',
    },
    update: {
      deletedAt: null,
    },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: {
      factoryId_name: {
        factoryId: factory.id,
        name: 'Main Warehouse',
      },
    },
    create: {
      tenantId: tenant.id,
      factoryId: factory.id,
      name: 'Main Warehouse',
    },
    update: {
      deletedAt: null,
    },
  });

  for (const name of warehouseZoneNames) {
    await prisma.warehouseZone.upsert({
      where: {
        warehouseId_name: {
          warehouseId: warehouse.id,
          name,
        },
      },
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        name,
      },
      update: {
        deletedAt: null,
      },
    });
  }

  const permissionsByKey = new Map<string, string>();
  const rolesByName = new Map<string, string>();

  for (const key of permissionDefinitions) {
    const permission = await prisma.permission.upsert({
      where: { key },
      create: {
        key,
        name: key,
      },
      update: {
        name: key,
      },
    });

    permissionsByKey.set(key, permission.id);
  }

  for (const [name, permissionKeys] of Object.entries(rolePermissions)) {
    const role = await prisma.role.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name,
        },
      },
      create: {
        tenantId: tenant.id,
        name,
      },
      update: {
        deletedAt: null,
      },
    });

    rolesByName.set(name, role.id);

    for (const permissionKey of permissionKeys) {
      const permissionId = permissionsByKey.get(permissionKey);

      if (!permissionId) {
        throw new Error(`Missing seeded permission: ${permissionKey}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          tenantId_roleId_permissionId: {
            tenantId: tenant.id,
            roleId: role.id,
            permissionId,
          },
        },
        create: {
          tenantId: tenant.id,
          roleId: role.id,
          permissionId,
        },
        update: {},
      });
    }
  }

  for (const demoUser of demoUsers) {
    const roleId = rolesByName.get(demoUser.role);

    if (!roleId) {
      throw new Error(`Missing seeded ${demoUser.role} role.`);
    }

    const user = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: demoUser.email,
        },
      },
      create: {
        tenantId: tenant.id,
        email: demoUser.email,
        name: demoUser.name,
        status: 'ACTIVE',
      },
      update: {
        name: demoUser.name,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    // LOCAL DEVELOPMENT ONLY.
    // Use argon2's default Argon2id settings so this seed stays compatible with
    // login and refresh-token flows without inventing project-specific params.
    const passwordHash = await argon2.hash(DEMO_PASSWORD);

    await prisma.userCredential.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id,
        },
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        passwordHash,
      },
      update: {},
    });

    await prisma.userRole.upsert({
      where: {
        tenantId_userId_roleId: {
          tenantId: tenant.id,
          userId: user.id,
          roleId,
        },
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        roleId,
      },
      update: {},
    });

    await prisma.userFactoryAccess.upsert({
      where: {
        tenantId_userId_factoryId: {
          tenantId: tenant.id,
          userId: user.id,
          factoryId: factory.id,
        },
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        factoryId: factory.id,
      },
      update: {},
    });
  }

  for (const [index, name] of productionStages.entries()) {
    await prisma.productionStage.upsert({
      where: {
        factoryId_name: {
          factoryId: factory.id,
          name,
        },
      },
      create: {
        tenantId: tenant.id,
        factoryId: factory.id,
        name,
        sortOrder: index + 1,
      },
      update: {
        sortOrder: index + 1,
        deletedAt: null,
      },
    });
  }

  for (const name of expenseCategoryNames) {
    await prisma.expenseCategory.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name,
        },
      },
      create: {
        tenantId: tenant.id,
        name,
      },
      update: {
        deletedAt: null,
      },
    });
  }

  for (const name of colorNames) {
    await prisma.color.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name,
        },
      },
      create: {
        tenantId: tenant.id,
        name,
      },
      update: {
        deletedAt: null,
      },
    });
  }

  for (const name of materialNames) {
    await prisma.material.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name,
        },
      },
      create: {
        tenantId: tenant.id,
        name,
      },
      update: {
        deletedAt: null,
      },
    });
  }

  for (const name of seasonNames) {
    await prisma.season.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name,
        },
      },
      create: {
        tenantId: tenant.id,
        name,
      },
      update: {
        deletedAt: null,
      },
    });
  }

  console.info('Paypoq OS development baseline seed completed.');
}

main()
  .catch((error: unknown) => {
    console.error('Paypoq OS development baseline seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
