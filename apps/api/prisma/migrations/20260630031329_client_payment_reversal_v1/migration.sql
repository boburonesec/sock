-- AlterTable
ALTER TABLE "ClientPayment" ADD COLUMN     "reversalReason" TEXT,
ADD COLUMN     "reversedAt" TIMESTAMP(3),
ADD COLUMN     "reversedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "ClientPayment_tenantId_reversedAt_idx" ON "ClientPayment"("tenantId", "reversedAt");

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_reversedByUserId_tenantId_fkey" FOREIGN KEY ("reversedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
