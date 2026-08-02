CREATE TABLE "SupplierPaymentIdempotency" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPaymentIdempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierPaymentIdempotency_paymentId_tenantId_key"
ON "SupplierPaymentIdempotency"("paymentId", "tenantId");

CREATE UNIQUE INDEX "SupplierPaymentIdempotency_tenantId_factoryId_operation_key_key"
ON "SupplierPaymentIdempotency"("tenantId", "factoryId", "operation", "key");

CREATE INDEX "SupplierPaymentIdempotency_tenantId_factoryId_createdAt_idx"
ON "SupplierPaymentIdempotency"("tenantId", "factoryId", "createdAt");

ALTER TABLE "SupplierPaymentIdempotency"
ADD CONSTRAINT "SupplierPaymentIdempotency_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierPaymentIdempotency"
ADD CONSTRAINT "SupplierPaymentIdempotency_factoryId_tenantId_fkey"
FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierPaymentIdempotency"
ADD CONSTRAINT "SupplierPaymentIdempotency_paymentId_fkey"
FOREIGN KEY ("paymentId", "tenantId") REFERENCES "SupplierPayment"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
