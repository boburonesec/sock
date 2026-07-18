-- Runtime RBAC data must be available after migrate deploy; production cannot
-- depend on demo/seed commands to create the machine workforce roles.
INSERT INTO "Permission" ("id", "key", "name", "createdAt", "updatedAt")
VALUES
  ('permission-machines-view', 'machines.view', 'Stanoklarni ko‘rish', NOW(), NOW()),
  ('permission-machines-write', 'machines.write', 'Stanoklarni boshqarish', NOW(), NOW()),
  ('permission-maintenance-view', 'maintenance.view', 'Texnik tasklarni ko‘rish', NOW(), NOW()),
  ('permission-maintenance-write', 'maintenance.write', 'Texnik tasklarni bajarish', NOW(), NOW()),
  ('permission-quality-view', 'quality.view', 'O‘lchov nazoratini ko‘rish', NOW(), NOW()),
  ('permission-quality-write', 'quality.write', 'O‘lchov nazoratini yuritish', NOW(), NOW())
ON CONFLICT ("key") DO UPDATE
SET "name" = EXCLUDED."name", "updatedAt" = NOW();

INSERT INTO "Role" ("id", "tenantId", "name", "description", "createdAt", "updatedAt")
SELECT md5(tenant."id" || ':Mechanic'), tenant."id", 'Mechanic',
       'Stanok assignmenti, texnik task va o‘lchov nazorati', NOW(), NOW()
FROM "Tenant" tenant
ON CONFLICT ("tenantId", "name") DO UPDATE
SET "description" = EXCLUDED."description", "deletedAt" = NULL, "updatedAt" = NOW();

INSERT INTO "Role" ("id", "tenantId", "name", "description", "createdAt", "updatedAt")
SELECT md5(tenant."id" || ':Mechanic Master'), tenant."id", 'Mechanic Master',
       'Mexaniklar, stanoklar va mahsulot o‘lchov standartlarini boshqaradi', NOW(), NOW()
FROM "Tenant" tenant
ON CONFLICT ("tenantId", "name") DO UPDATE
SET "description" = EXCLUDED."description", "deletedAt" = NULL, "updatedAt" = NOW();

INSERT INTO "RolePermission" ("id", "tenantId", "roleId", "permissionId", "createdAt", "updatedAt")
SELECT md5(role."tenantId" || ':' || role."id" || ':' || permission."id"),
       role."tenantId", role."id", permission."id", NOW(), NOW()
FROM "Role" role
JOIN "Permission" permission ON permission."key" = ANY (
  CASE role."name"
    WHEN 'Mechanic' THEN ARRAY['production.view', 'machines.view', 'maintenance.view', 'maintenance.write', 'quality.view', 'quality.write']
    WHEN 'Mechanic Master' THEN ARRAY['production.view', 'production.write', 'machines.view', 'machines.write', 'maintenance.view', 'maintenance.write', 'quality.view', 'quality.write', 'employees.view']
  END
)
WHERE role."name" IN ('Mechanic', 'Mechanic Master') AND role."deletedAt" IS NULL
ON CONFLICT ("tenantId", "roleId", "permissionId") DO NOTHING;

-- Shift Receiver starts/stops runs and accepts output, so it also needs the
-- read side of the machine workspace. It does not receive machines.write.
INSERT INTO "RolePermission" ("id", "tenantId", "roleId", "permissionId", "createdAt", "updatedAt")
SELECT md5(role."tenantId" || ':' || role."id" || ':' || permission."id"),
       role."tenantId", role."id", permission."id", NOW(), NOW()
FROM "Role" role
JOIN "Permission" permission ON permission."key" = 'machines.view'
WHERE role."name" = 'Shift Receiver' AND role."deletedAt" IS NULL
ON CONFLICT ("tenantId", "roleId", "permissionId") DO NOTHING;
