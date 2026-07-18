CREATE TYPE "WorkShiftCode" AS ENUM ('DAY', 'NIGHT');

CREATE TABLE "WorkShift" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "code" "WorkShiftCode" NOT NULL,
    "name" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "premiumPerPiece" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WorkShift_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkShift_id_tenantId_factoryId_key"
  ON "WorkShift"("id", "tenantId", "factoryId");
CREATE UNIQUE INDEX "WorkShift_tenantId_factoryId_code_key"
  ON "WorkShift"("tenantId", "factoryId", "code");
CREATE INDEX "WorkShift_tenantId_factoryId_deletedAt_idx"
  ON "WorkShift"("tenantId", "factoryId", "deletedAt");

ALTER TABLE "WorkShift"
  ADD CONSTRAINT "WorkShift_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkShift"
  ADD CONSTRAINT "WorkShift_factoryId_tenantId_fkey"
  FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Employee" ADD COLUMN "workShiftId" TEXT;
CREATE INDEX "Employee_tenantId_factoryId_workShiftId_idx"
  ON "Employee"("tenantId", "factoryId", "workShiftId");
ALTER TABLE "Employee"
  ADD CONSTRAINT "Employee_workShiftId_tenantId_factoryId_fkey"
  FOREIGN KEY ("workShiftId", "tenantId", "factoryId")
  REFERENCES "WorkShift"("id", "tenantId", "factoryId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workShiftId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL,
    "checkOutAt" TIMESTAMP(3),
    "shiftCode" "WorkShiftCode" NOT NULL,
    "shiftName" TEXT NOT NULL,
    "shiftStartMinute" INTEGER NOT NULL,
    "shiftEndMinute" INTEGER NOT NULL,
    "externalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceRecord_tenantId_factoryId_employeeId_workDate_key"
  ON "AttendanceRecord"("tenantId", "factoryId", "employeeId", "workDate");
CREATE INDEX "AttendanceRecord_tenantId_factoryId_workDate_idx"
  ON "AttendanceRecord"("tenantId", "factoryId", "workDate");
CREATE INDEX "AttendanceRecord_tenantId_factoryId_workShiftId_workDate_idx"
  ON "AttendanceRecord"("tenantId", "factoryId", "workShiftId", "workDate");
CREATE INDEX "AttendanceRecord_tenantId_employeeId_workDate_idx"
  ON "AttendanceRecord"("tenantId", "employeeId", "workDate");
CREATE INDEX "AttendanceRecord_externalReference_idx"
  ON "AttendanceRecord"("externalReference");

ALTER TABLE "AttendanceRecord"
  ADD CONSTRAINT "AttendanceRecord_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord"
  ADD CONSTRAINT "AttendanceRecord_factoryId_tenantId_fkey"
  FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord"
  ADD CONSTRAINT "AttendanceRecord_employeeId_tenantId_factoryId_fkey"
  FOREIGN KEY ("employeeId", "tenantId", "factoryId")
  REFERENCES "Employee"("id", "tenantId", "factoryId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord"
  ADD CONSTRAINT "AttendanceRecord_workShiftId_tenantId_factoryId_fkey"
  FOREIGN KEY ("workShiftId", "tenantId", "factoryId")
  REFERENCES "WorkShift"("id", "tenantId", "factoryId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkerActivity"
  ADD COLUMN "workShiftId" TEXT,
  ADD COLUMN "workShiftCode" "WorkShiftCode",
  ADD COLUMN "baseSalaryRateAmount" DECIMAL(14,2),
  ADD COLUMN "shiftPremiumAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;

UPDATE "WorkerActivity"
SET "baseSalaryRateAmount" = "salaryRateAmount"
WHERE "baseSalaryRateAmount" IS NULL;

ALTER TABLE "WorkerActivity"
  ALTER COLUMN "baseSalaryRateAmount" SET NOT NULL;

CREATE INDEX "WorkerActivity_tenantId_factoryId_workShiftId_activityDate_idx"
  ON "WorkerActivity"("tenantId", "factoryId", "workShiftId", "activityDate");
ALTER TABLE "WorkerActivity"
  ADD CONSTRAINT "WorkerActivity_workShiftId_tenantId_factoryId_fkey"
  FOREIGN KEY ("workShiftId", "tenantId", "factoryId")
  REFERENCES "WorkShift"("id", "tenantId", "factoryId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "key", "name", "description", "createdAt", "updatedAt")
VALUES (
  'permission-attendance-view-v1',
  'attendance.view',
  'attendance.view',
  'Xodimlar davomatini ko‘rish',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RolePermission" (
  "id", "tenantId", "roleId", "permissionId", "createdAt", "updatedAt"
)
SELECT
  'rp-att-' || SUBSTRING(MD5(r."id") FROM 1 FOR 20),
  r."tenantId",
  r."id",
  p."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" IN ('Owner', 'Manager')
  AND r."deletedAt" IS NULL
  AND p."key" = 'attendance.view'
ON CONFLICT ("tenantId", "roleId", "permissionId") DO NOTHING;
