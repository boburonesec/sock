-- Existing employees are preserved as regular stage workers. Historical batches
-- keep nullable workforce references because their participants are unknown.
CREATE TYPE "EmployeeJobRole" AS ENUM ('STAGE_WORKER', 'MECHANIC', 'MACHINE_OPERATOR');

ALTER TABLE "Employee"
ADD COLUMN "jobRole" "EmployeeJobRole" NOT NULL DEFAULT 'STAGE_WORKER';

ALTER TABLE "ProductionBatch"
ADD COLUMN "mechanicEmployeeId" TEXT,
ADD COLUMN "machineOperatorEmployeeId" TEXT;

CREATE INDEX "ProductionBatch_mechanic_idx"
ON "ProductionBatch"("tenantId", "factoryId", "mechanicEmployeeId");

CREATE INDEX "ProductionBatch_machine_operator_idx"
ON "ProductionBatch"("tenantId", "factoryId", "machineOperatorEmployeeId");

ALTER TABLE "ProductionBatch"
ADD CONSTRAINT "ProductionBatch_mechanic_fkey"
FOREIGN KEY ("mechanicEmployeeId", "tenantId", "factoryId")
REFERENCES "Employee"("id", "tenantId", "factoryId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductionBatch"
ADD CONSTRAINT "ProductionBatch_machine_operator_fkey"
FOREIGN KEY ("machineOperatorEmployeeId", "tenantId", "factoryId")
REFERENCES "Employee"("id", "tenantId", "factoryId")
ON DELETE RESTRICT ON UPDATE CASCADE;
