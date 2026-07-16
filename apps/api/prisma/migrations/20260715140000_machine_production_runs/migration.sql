CREATE TYPE "MachineStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE');
CREATE TYPE "MachineWorkRole" AS ENUM ('MECHANIC', 'MACHINE_OPERATOR');
CREATE TYPE "ProductionRunStatus" AS ENUM ('PLANNED', 'RUNNING', 'STOPPED', 'COMPLETED', 'HOLD', 'CANCELLED');
CREATE TYPE "WorkerActivitySource" AS ENUM ('STAGE_MOVEMENT', 'MACHINE_OUTPUT', 'MANUAL_CORRECTION');

CREATE TABLE "Machine" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "factoryId" TEXT NOT NULL,
  "code" TEXT NOT NULL, "name" TEXT NOT NULL, "status" "MachineStatus" NOT NULL DEFAULT 'ACTIVE', "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Machine_id_tenantId_factoryId_key" ON "Machine"("id", "tenantId", "factoryId");
CREATE UNIQUE INDEX "Machine_tenantId_factoryId_code_key" ON "Machine"("tenantId", "factoryId", "code");
CREATE INDEX "Machine_tenantId_factoryId_status_deletedAt_idx" ON "Machine"("tenantId", "factoryId", "status", "deletedAt");

CREATE TABLE "MachineMechanicAssignment" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "factoryId" TEXT NOT NULL, "machineId" TEXT NOT NULL,
  "mechanicId" TEXT NOT NULL, "workShiftId" TEXT NOT NULL, "validFrom" TIMESTAMP(3) NOT NULL, "validTo" TIMESTAMP(3),
  "assignedByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MachineMechanicAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MachineMechanicAssignment_dates_check" CHECK ("validTo" IS NULL OR "validTo" > "validFrom")
);
CREATE UNIQUE INDEX "MachineMechanicAssignment_id_tenantId_key" ON "MachineMechanicAssignment"("id", "tenantId");
CREATE INDEX "MachineMechanicAssignment_tenantId_factoryId_machineId_work_idx" ON "MachineMechanicAssignment"("tenantId", "factoryId", "machineId", "workShiftId", "validFrom", "validTo");
CREATE INDEX "MachineMechanicAssignment_tenantId_factoryId_mechanicId_val_idx" ON "MachineMechanicAssignment"("tenantId", "factoryId", "mechanicId", "validFrom", "validTo");

CREATE TABLE "ProductionRun" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "factoryId" TEXT NOT NULL, "machineId" TEXT NOT NULL,
  "productVariantId" TEXT NOT NULL, "operatorEmployeeId" TEXT NOT NULL, "mechanicEmployeeId" TEXT NOT NULL, "workShiftId" TEXT NOT NULL,
  "status" "ProductionRunStatus" NOT NULL DEFAULT 'PLANNED', "startedAt" TIMESTAMP(3), "endedAt" TIMESTAMP(3),
  "startedByUserId" TEXT NOT NULL, "endedByUserId" TEXT, "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductionRun_id_tenantId_factoryId_key" ON "ProductionRun"("id", "tenantId", "factoryId");
CREATE INDEX "ProductionRun_tenantId_factoryId_machineId_status_idx" ON "ProductionRun"("tenantId", "factoryId", "machineId", "status");
CREATE INDEX "ProductionRun_tenantId_factoryId_mechanicEmployeeId_status_idx" ON "ProductionRun"("tenantId", "factoryId", "mechanicEmployeeId", "status");

CREATE TABLE "MachinePieceRate" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "factoryId" TEXT NOT NULL, "productId" TEXT NOT NULL,
  "workRole" "MachineWorkRole" NOT NULL, "amount" DECIMAL(14,2) NOT NULL, "effectiveFrom" TIMESTAMP(3) NOT NULL, "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "MachinePieceRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MachinePieceRate_amount_check" CHECK ("amount" >= 0),
  CONSTRAINT "MachinePieceRate_dates_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
);
CREATE UNIQUE INDEX "MachinePieceRate_id_tenantId_key" ON "MachinePieceRate"("id", "tenantId");
CREATE INDEX "MachinePieceRate_tenantId_factoryId_productId_workRole_effe_idx" ON "MachinePieceRate"("tenantId", "factoryId", "productId", "workRole", "effectiveFrom");

ALTER TABLE "ProductionBatch" ADD COLUMN "productionRunId" TEXT;
ALTER TABLE "WorkerActivity" ADD COLUMN "source" "WorkerActivitySource" NOT NULL DEFAULT 'STAGE_MOVEMENT', ADD COLUMN "productionRunIntakeId" TEXT, ADD COLUMN "machinePieceRateId" TEXT;

CREATE TABLE "ProductionRunIntake" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "factoryId" TEXT NOT NULL, "productionRunId" TEXT NOT NULL,
  "productionBatchId" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "idempotencyKey" TEXT NOT NULL, "recordedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductionRunIntake_pkey" PRIMARY KEY ("id"), CONSTRAINT "ProductionRunIntake_quantity_check" CHECK ("quantity" > 0)
);
CREATE UNIQUE INDEX "ProductionRunIntake_id_tenantId_key" ON "ProductionRunIntake"("id", "tenantId");
CREATE UNIQUE INDEX "ProductionRunIntake_tenantId_idempotencyKey_key" ON "ProductionRunIntake"("tenantId", "idempotencyKey");
CREATE UNIQUE INDEX "ProductionRunIntake_tenantId_productionBatchId_key" ON "ProductionRunIntake"("tenantId", "productionBatchId");
CREATE UNIQUE INDEX "ProductionRunIntake_productionBatchId_tenantId_factoryId_key" ON "ProductionRunIntake"("productionBatchId", "tenantId", "factoryId");
CREATE INDEX "ProductionRunIntake_tenantId_factoryId_productionRunId_crea_idx" ON "ProductionRunIntake"("tenantId", "factoryId", "productionRunId", "createdAt");
CREATE INDEX "ProductionBatch_tenantId_factoryId_productionRunId_idx" ON "ProductionBatch"("tenantId", "factoryId", "productionRunId");
CREATE UNIQUE INDEX "WorkerActivity_tenantId_productionRunIntakeId_employeeId_key" ON "WorkerActivity"("tenantId", "productionRunIntakeId", "employeeId");

ALTER TABLE "Machine" ADD CONSTRAINT "Machine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MachineMechanicAssignment" ADD CONSTRAINT "MachineMechanicAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MachineMechanicAssignment" ADD CONSTRAINT "MachineMechanicAssignment_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MachineMechanicAssignment" ADD CONSTRAINT "MachineMechanicAssignment_machineId_tenantId_factoryId_fkey" FOREIGN KEY ("machineId", "tenantId", "factoryId") REFERENCES "Machine"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MachineMechanicAssignment" ADD CONSTRAINT "MachineMechanicAssignment_mechanicId_tenantId_factoryId_fkey" FOREIGN KEY ("mechanicId", "tenantId", "factoryId") REFERENCES "Employee"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MachineMechanicAssignment" ADD CONSTRAINT "MachineMechanicAssignment_workShiftId_tenantId_factoryId_fkey" FOREIGN KEY ("workShiftId", "tenantId", "factoryId") REFERENCES "WorkShift"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MachineMechanicAssignment" ADD CONSTRAINT "MachineMechanicAssignment_assignedByUserId_tenantId_fkey" FOREIGN KEY ("assignedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_machineId_tenantId_factoryId_fkey" FOREIGN KEY ("machineId", "tenantId", "factoryId") REFERENCES "Machine"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_productVariantId_tenantId_fkey" FOREIGN KEY ("productVariantId", "tenantId") REFERENCES "ProductVariant"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_operatorEmployeeId_tenantId_factoryId_fkey" FOREIGN KEY ("operatorEmployeeId", "tenantId", "factoryId") REFERENCES "Employee"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_mechanicEmployeeId_tenantId_factoryId_fkey" FOREIGN KEY ("mechanicEmployeeId", "tenantId", "factoryId") REFERENCES "Employee"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_workShiftId_tenantId_factoryId_fkey" FOREIGN KEY ("workShiftId", "tenantId", "factoryId") REFERENCES "WorkShift"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_startedByUserId_tenantId_fkey" FOREIGN KEY ("startedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_endedByUserId_tenantId_fkey" FOREIGN KEY ("endedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MachinePieceRate" ADD CONSTRAINT "MachinePieceRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MachinePieceRate" ADD CONSTRAINT "MachinePieceRate_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MachinePieceRate" ADD CONSTRAINT "MachinePieceRate_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRunIntake" ADD CONSTRAINT "ProductionRunIntake_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRunIntake" ADD CONSTRAINT "ProductionRunIntake_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRunIntake" ADD CONSTRAINT "ProductionRunIntake_productionRunId_tenantId_factoryId_fkey" FOREIGN KEY ("productionRunId", "tenantId", "factoryId") REFERENCES "ProductionRun"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRunIntake" ADD CONSTRAINT "ProductionRunIntake_productionBatchId_tenantId_factoryId_fkey" FOREIGN KEY ("productionBatchId", "tenantId", "factoryId") REFERENCES "ProductionBatch"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRunIntake" ADD CONSTRAINT "ProductionRunIntake_recordedByUserId_tenantId_fkey" FOREIGN KEY ("recordedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_productionRunId_tenantId_factoryId_fkey" FOREIGN KEY ("productionRunId", "tenantId", "factoryId") REFERENCES "ProductionRun"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkerActivity" ADD CONSTRAINT "WorkerActivity_productionRunIntakeId_tenantId_fkey" FOREIGN KEY ("productionRunIntakeId", "tenantId") REFERENCES "ProductionRunIntake"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkerActivity" ADD CONSTRAINT "WorkerActivity_machinePieceRateId_tenantId_fkey" FOREIGN KEY ("machinePieceRateId", "tenantId") REFERENCES "MachinePieceRate"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
