CREATE TYPE "EmployeeWorkProfile" AS ENUM ('STAGE_WORKER', 'MACHINE_OPERATOR', 'MECHANIC', 'MECHANIC_MASTER', 'STAFF');
CREATE TYPE "EmployeeCompensationType" AS ENUM ('PIECE_RATE', 'SALARIED');

ALTER TABLE "Employee"
  ADD COLUMN "workProfile" "EmployeeWorkProfile" NOT NULL DEFAULT 'STAGE_WORKER',
  ADD COLUMN "compensationType" "EmployeeCompensationType" NOT NULL DEFAULT 'PIECE_RATE';

UPDATE "Employee"
SET "workProfile" = CASE "jobRole"::text
  WHEN 'MECHANIC' THEN 'MECHANIC'::"EmployeeWorkProfile"
  WHEN 'MACHINE_OPERATOR' THEN 'MACHINE_OPERATOR'::"EmployeeWorkProfile"
  ELSE 'STAGE_WORKER'::"EmployeeWorkProfile"
END;

ALTER TABLE "User" ADD COLUMN "employeeId" TEXT;
CREATE UNIQUE INDEX "User_tenantId_employeeId_key" ON "User"("tenantId", "employeeId");
CREATE UNIQUE INDEX "User_employeeId_tenantId_key" ON "User"("employeeId", "tenantId");
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_tenantId_fkey"
  FOREIGN KEY ("employeeId", "tenantId") REFERENCES "Employee"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "EmployeeSalaryAgreement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "monthlyAmount" DECIMAL(14,2) NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmployeeSalaryAgreement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeSalaryAgreement_amount_check" CHECK ("monthlyAmount" >= 0),
  CONSTRAINT "EmployeeSalaryAgreement_dates_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
);
CREATE UNIQUE INDEX "EmployeeSalaryAgreement_id_tenantId_key" ON "EmployeeSalaryAgreement"("id", "tenantId");
CREATE INDEX "EmployeeSalaryAgreement_tenantId_factoryId_employeeId_effec_idx" ON "EmployeeSalaryAgreement"("tenantId", "factoryId", "employeeId", "effectiveFrom");
ALTER TABLE "EmployeeSalaryAgreement" ADD CONSTRAINT "EmployeeSalaryAgreement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeSalaryAgreement" ADD CONSTRAINT "EmployeeSalaryAgreement_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeSalaryAgreement" ADD CONSTRAINT "EmployeeSalaryAgreement_employeeId_tenantId_factoryId_fkey" FOREIGN KEY ("employeeId", "tenantId", "factoryId") REFERENCES "Employee"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeSalaryAgreement" ADD CONSTRAINT "EmployeeSalaryAgreement_createdByUserId_tenantId_fkey" FOREIGN KEY ("createdByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
