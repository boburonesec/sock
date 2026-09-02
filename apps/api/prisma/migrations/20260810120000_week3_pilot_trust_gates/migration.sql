CREATE TYPE "ShiftReconciliationStatus" AS ENUM ('OPEN', 'READY_FOR_HANDOVER', 'ACCEPTED');
CREATE TYPE "CorrectionRequestDomain" AS ENUM ('PRODUCTION_MOVEMENT', 'WORKER_ACTIVITY', 'SUPPLIER_PAYMENT');
CREATE TYPE "CorrectionRequestStatus" AS ENUM ('OPEN', 'RESOLVED');

ALTER TABLE "Factory" ADD COLUMN "warehouseHandoffStageId" TEXT;
ALTER TABLE "PayrollPeriod"
  ADD COLUMN "calculationRevision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "approvedRevision" INTEGER,
  ADD COLUMN "approvedByUserId" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3);

CREATE TABLE "ShiftReconciliation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "workShiftId" TEXT NOT NULL,
  "workDate" DATE NOT NULL,
  "status" "ShiftReconciliationStatus" NOT NULL DEFAULT 'OPEN',
  "submittedByUserId" TEXT,
  "submittedAt" TIMESTAMP(3),
  "returnedByUserId" TEXT,
  "returnedAt" TIMESTAMP(3),
  "returnReason" TEXT,
  "acceptedByUserId" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "warningAcknowledgment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShiftReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CorrectionRequest" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "domain" "CorrectionRequestDomain" NOT NULL,
  "sourceRecordId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "CorrectionRequestStatus" NOT NULL DEFAULT 'OPEN',
  "requestedByUserId" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CorrectionRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShiftReconciliation_id_tenantId_factoryId_key" ON "ShiftReconciliation"("id", "tenantId", "factoryId");
CREATE UNIQUE INDEX "ShiftReconciliation_tenantId_factoryId_workShiftId_workDate_key" ON "ShiftReconciliation"("tenantId", "factoryId", "workShiftId", "workDate");
CREATE INDEX "ShiftReconciliation_tenantId_factoryId_workDate_status_idx" ON "ShiftReconciliation"("tenantId", "factoryId", "workDate", "status");
CREATE UNIQUE INDEX "CorrectionRequest_id_tenantId_factoryId_key" ON "CorrectionRequest"("id", "tenantId", "factoryId");
CREATE INDEX "CorrectionRequest_tenantId_factoryId_status_requestedAt_idx" ON "CorrectionRequest"("tenantId", "factoryId", "status", "requestedAt");
CREATE INDEX "CorrectionRequest_tenantId_factoryId_domain_sourceRecordId_idx" ON "CorrectionRequest"("tenantId", "factoryId", "domain", "sourceRecordId");

ALTER TABLE "Factory" ADD CONSTRAINT "Factory_warehouseHandoffStageId_tenantId_id_fkey"
  FOREIGN KEY ("warehouseHandoffStageId", "tenantId", "id") REFERENCES "ProductionStage"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftReconciliation" ADD CONSTRAINT "ShiftReconciliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftReconciliation" ADD CONSTRAINT "ShiftReconciliation_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftReconciliation" ADD CONSTRAINT "ShiftReconciliation_workShiftId_tenantId_factoryId_fkey" FOREIGN KEY ("workShiftId", "tenantId", "factoryId") REFERENCES "WorkShift"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
