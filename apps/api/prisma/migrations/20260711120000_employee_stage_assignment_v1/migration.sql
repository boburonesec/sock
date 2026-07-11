-- Employee can be assigned to one or more production stages (piece-rate work).
CREATE TABLE "EmployeeStageAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "productionStageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeStageAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployeeStageAssignment_tenantId_employeeId_productionStageId_key"
  ON "EmployeeStageAssignment"("tenantId", "employeeId", "productionStageId");

CREATE INDEX "EmployeeStageAssignment_tenantId_factoryId_productionStageId_idx"
  ON "EmployeeStageAssignment"("tenantId", "factoryId", "productionStageId");

CREATE INDEX "EmployeeStageAssignment_tenantId_employeeId_idx"
  ON "EmployeeStageAssignment"("tenantId", "employeeId");

ALTER TABLE "EmployeeStageAssignment"
  ADD CONSTRAINT "EmployeeStageAssignment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmployeeStageAssignment"
  ADD CONSTRAINT "EmployeeStageAssignment_factoryId_tenantId_fkey"
  FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmployeeStageAssignment"
  ADD CONSTRAINT "EmployeeStageAssignment_employeeId_tenantId_factoryId_fkey"
  FOREIGN KEY ("employeeId", "tenantId", "factoryId") REFERENCES "Employee"("id", "tenantId", "factoryId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmployeeStageAssignment"
  ADD CONSTRAINT "EmployeeStageAssignment_productionStageId_tenantId_factoryId_fkey"
  FOREIGN KEY ("productionStageId", "tenantId", "factoryId") REFERENCES "ProductionStage"("id", "tenantId", "factoryId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
