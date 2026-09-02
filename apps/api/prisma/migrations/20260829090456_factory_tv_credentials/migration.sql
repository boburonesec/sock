-- CreateTable
CREATE TABLE "FactoryTvCredential" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "FactoryTvCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FactoryTvCredential_tokenHash_key" ON "FactoryTvCredential"("tokenHash");

-- CreateIndex
CREATE INDEX "FactoryTvCredential_tenantId_factoryId_revokedAt_idx" ON "FactoryTvCredential"("tenantId", "factoryId", "revokedAt");

-- RenameForeignKey
ALTER TABLE "EmployeeStageAssignment" RENAME CONSTRAINT "EmployeeStageAssignment_productionStageId_tenantId_factoryId_fk" TO "EmployeeStageAssignment_productionStageId_tenantId_factory_fkey";

-- RenameForeignKey
ALTER TABLE "SupplierPaymentIdempotency" RENAME CONSTRAINT "SupplierPaymentIdempotency_paymentId_fkey" TO "SupplierPaymentIdempotency_paymentId_tenantId_fkey";

-- AddForeignKey
ALTER TABLE "FactoryTvCredential" ADD CONSTRAINT "FactoryTvCredential_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactoryTvCredential" ADD CONSTRAINT "FactoryTvCredential_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "EmployeeStageAssignment_tenantId_employeeId_productionStageId_k" RENAME TO "EmployeeStageAssignment_tenantId_employeeId_productionStage_key";

-- RenameIndex
ALTER INDEX "EmployeeStageAssignment_tenantId_factoryId_productionStageId_id" RENAME TO "EmployeeStageAssignment_tenantId_factoryId_productionStageI_idx";
