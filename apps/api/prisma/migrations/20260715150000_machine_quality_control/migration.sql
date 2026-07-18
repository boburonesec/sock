CREATE TYPE "MaintenanceTaskType" AS ENUM ('REPAIR', 'SETUP', 'INSPECTION', 'OTHER');
CREATE TYPE "MaintenanceTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "MaintenanceTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MeasurementSpecificationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "InspectionRoundStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PASSED', 'ATTENTION', 'MISSED');
CREATE TYPE "QualityIssueStatus" AS ENUM ('ATTENTION', 'RECHECK_DUE', 'ESCALATED', 'RESOLVED');

CREATE TABLE "MaintenanceTask" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "factoryId" TEXT NOT NULL, "machineId" TEXT NOT NULL, "assigneeMechanicId" TEXT NOT NULL,
  "type" "MaintenanceTaskType" NOT NULL, "priority" "MaintenanceTaskPriority" NOT NULL DEFAULT 'MEDIUM', "status" "MaintenanceTaskStatus" NOT NULL DEFAULT 'OPEN',
  "dueAt" TIMESTAMP(3), "description" TEXT NOT NULL, "resolution" TEXT, "createdByUserId" TEXT NOT NULL, "completedByUserId" TEXT, "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceTask_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MaintenanceTask_id_tenantId_key" ON "MaintenanceTask"("id", "tenantId");
CREATE INDEX "MaintenanceTask_tenantId_factoryId_assigneeMechanicId_statu_idx" ON "MaintenanceTask"("tenantId", "factoryId", "assigneeMechanicId", "status", "dueAt");
CREATE INDEX "MaintenanceTask_tenantId_factoryId_machineId_status_idx" ON "MaintenanceTask"("tenantId", "factoryId", "machineId", "status");

CREATE TABLE "ProductMeasurementSpecification" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "productId" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "status" "MeasurementSpecificationStatus" NOT NULL DEFAULT 'DRAFT', "effectiveFrom" TIMESTAMP(3), "createdByUserId" TEXT NOT NULL, "activatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductMeasurementSpecification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductMeasurementSpecification_id_tenantId_key" ON "ProductMeasurementSpecification"("id", "tenantId");
CREATE UNIQUE INDEX "ProductMeasurementSpecification_tenantId_productId_version_key" ON "ProductMeasurementSpecification"("tenantId", "productId", "version");
CREATE INDEX "ProductMeasurementSpecification_tenantId_productId_status_e_idx" ON "ProductMeasurementSpecification"("tenantId", "productId", "status", "effectiveFrom");

CREATE TABLE "ProductMeasurementMetric" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "specificationId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "unit" TEXT NOT NULL,
  "target" DECIMAL(14,3) NOT NULL, "min" DECIMAL(14,3) NOT NULL, "max" DECIMAL(14,3) NOT NULL, "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductMeasurementMetric_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductMeasurementMetric_range_check" CHECK ("min" <= "target" AND "target" <= "max")
);
CREATE UNIQUE INDEX "ProductMeasurementMetric_id_tenantId_key" ON "ProductMeasurementMetric"("id", "tenantId");
CREATE UNIQUE INDEX "ProductMeasurementMetric_tenantId_specificationId_code_key" ON "ProductMeasurementMetric"("tenantId", "specificationId", "code");
CREATE UNIQUE INDEX "ProductMeasurementMetric_tenantId_specificationId_displayOr_key" ON "ProductMeasurementMetric"("tenantId", "specificationId", "displayOrder");

CREATE TABLE "InspectionScheduleSlot" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "factoryId" TEXT NOT NULL, "workShiftId" TEXT NOT NULL, "slotNumber" INTEGER NOT NULL, "minuteOffset" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InspectionScheduleSlot_pkey" PRIMARY KEY ("id"), CONSTRAINT "InspectionScheduleSlot_number_check" CHECK ("slotNumber" BETWEEN 1 AND 3), CONSTRAINT "InspectionScheduleSlot_offset_check" CHECK ("minuteOffset" >= 0)
);
CREATE UNIQUE INDEX "InspectionScheduleSlot_id_tenantId_key" ON "InspectionScheduleSlot"("id", "tenantId");
CREATE UNIQUE INDEX "InspectionScheduleSlot_tenantId_factoryId_workShiftId_slotN_key" ON "InspectionScheduleSlot"("tenantId", "factoryId", "workShiftId", "slotNumber");

CREATE TABLE "InspectionRound" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "factoryId" TEXT NOT NULL, "machineId" TEXT NOT NULL, "productionRunId" TEXT NOT NULL,
  "mechanicEmployeeId" TEXT NOT NULL, "specificationId" TEXT NOT NULL, "scheduleSlotId" TEXT NOT NULL,
  "status" "InspectionRoundStatus" NOT NULL DEFAULT 'PENDING', "scheduledAt" TIMESTAMP(3) NOT NULL, "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "dedupeKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InspectionRound_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InspectionRound_id_tenantId_key" ON "InspectionRound"("id", "tenantId");
CREATE UNIQUE INDEX "InspectionRound_tenantId_dedupeKey_key" ON "InspectionRound"("tenantId", "dedupeKey");
CREATE INDEX "InspectionRound_tenantId_factoryId_mechanicEmployeeId_sched_idx" ON "InspectionRound"("tenantId", "factoryId", "mechanicEmployeeId", "scheduledAt", "status");

CREATE TABLE "InspectionMeasurement" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "roundId" TEXT NOT NULL, "metricId" TEXT NOT NULL,
  "value" DECIMAL(14,3) NOT NULL, "target" DECIMAL(14,3) NOT NULL, "min" DECIMAL(14,3) NOT NULL, "max" DECIMAL(14,3) NOT NULL,
  "isWithinRange" BOOLEAN NOT NULL, "measuredAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InspectionMeasurement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InspectionMeasurement_tenantId_roundId_metricId_key" ON "InspectionMeasurement"("tenantId", "roundId", "metricId");

CREATE TABLE "QualityIssue" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "factoryId" TEXT NOT NULL, "inspectionRoundId" TEXT NOT NULL, "machineId" TEXT NOT NULL,
  "productionRunId" TEXT NOT NULL, "mechanicEmployeeId" TEXT NOT NULL, "status" "QualityIssueStatus" NOT NULL DEFAULT 'ATTENTION', "details" JSONB NOT NULL,
  "recheckDueAt" TIMESTAMP(3) NOT NULL, "resolvedAt" TIMESTAMP(3), "resolvedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QualityIssue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QualityIssue_id_tenantId_key" ON "QualityIssue"("id", "tenantId");
CREATE INDEX "QualityIssue_tenantId_factoryId_status_recheckDueAt_idx" ON "QualityIssue"("tenantId", "factoryId", "status", "recheckDueAt");

ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_machineId_tenantId_factoryId_fkey" FOREIGN KEY ("machineId", "tenantId", "factoryId") REFERENCES "Machine"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_assigneeMechanicId_tenantId_factoryId_fkey" FOREIGN KEY ("assigneeMechanicId", "tenantId", "factoryId") REFERENCES "Employee"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_createdByUserId_tenantId_fkey" FOREIGN KEY ("createdByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_completedByUserId_tenantId_fkey" FOREIGN KEY ("completedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductMeasurementSpecification" ADD CONSTRAINT "ProductMeasurementSpecification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductMeasurementSpecification" ADD CONSTRAINT "ProductMeasurementSpecification_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductMeasurementSpecification" ADD CONSTRAINT "ProductMeasurementSpecification_createdByUserId_tenantId_fkey" FOREIGN KEY ("createdByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductMeasurementSpecification" ADD CONSTRAINT "ProductMeasurementSpecification_activatedByUserId_tenantId_fkey" FOREIGN KEY ("activatedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductMeasurementMetric" ADD CONSTRAINT "ProductMeasurementMetric_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductMeasurementMetric" ADD CONSTRAINT "ProductMeasurementMetric_specificationId_tenantId_fkey" FOREIGN KEY ("specificationId", "tenantId") REFERENCES "ProductMeasurementSpecification"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionScheduleSlot" ADD CONSTRAINT "InspectionScheduleSlot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionScheduleSlot" ADD CONSTRAINT "InspectionScheduleSlot_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionScheduleSlot" ADD CONSTRAINT "InspectionScheduleSlot_workShiftId_tenantId_factoryId_fkey" FOREIGN KEY ("workShiftId", "tenantId", "factoryId") REFERENCES "WorkShift"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionRound" ADD CONSTRAINT "InspectionRound_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionRound" ADD CONSTRAINT "InspectionRound_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionRound" ADD CONSTRAINT "InspectionRound_machineId_tenantId_factoryId_fkey" FOREIGN KEY ("machineId", "tenantId", "factoryId") REFERENCES "Machine"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionRound" ADD CONSTRAINT "InspectionRound_productionRunId_tenantId_factoryId_fkey" FOREIGN KEY ("productionRunId", "tenantId", "factoryId") REFERENCES "ProductionRun"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionRound" ADD CONSTRAINT "InspectionRound_mechanicEmployeeId_tenantId_factoryId_fkey" FOREIGN KEY ("mechanicEmployeeId", "tenantId", "factoryId") REFERENCES "Employee"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionRound" ADD CONSTRAINT "InspectionRound_specificationId_tenantId_fkey" FOREIGN KEY ("specificationId", "tenantId") REFERENCES "ProductMeasurementSpecification"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionRound" ADD CONSTRAINT "InspectionRound_scheduleSlotId_tenantId_fkey" FOREIGN KEY ("scheduleSlotId", "tenantId") REFERENCES "InspectionScheduleSlot"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionMeasurement" ADD CONSTRAINT "InspectionMeasurement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionMeasurement" ADD CONSTRAINT "InspectionMeasurement_roundId_tenantId_fkey" FOREIGN KEY ("roundId", "tenantId") REFERENCES "InspectionRound"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionMeasurement" ADD CONSTRAINT "InspectionMeasurement_metricId_tenantId_fkey" FOREIGN KEY ("metricId", "tenantId") REFERENCES "ProductMeasurementMetric"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_inspectionRoundId_tenantId_fkey" FOREIGN KEY ("inspectionRoundId", "tenantId") REFERENCES "InspectionRound"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_machineId_tenantId_factoryId_fkey" FOREIGN KEY ("machineId", "tenantId", "factoryId") REFERENCES "Machine"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_productionRunId_tenantId_factoryId_fkey" FOREIGN KEY ("productionRunId", "tenantId", "factoryId") REFERENCES "ProductionRun"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_mechanicEmployeeId_tenantId_factoryId_fkey" FOREIGN KEY ("mechanicEmployeeId", "tenantId", "factoryId") REFERENCES "Employee"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_resolvedByUserId_tenantId_fkey" FOREIGN KEY ("resolvedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
