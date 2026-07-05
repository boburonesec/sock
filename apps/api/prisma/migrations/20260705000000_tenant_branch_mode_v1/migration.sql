-- CreateEnum
CREATE TYPE "TenantBranchMode" AS ENUM ('SINGLE', 'MULTI');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "branchMode" "TenantBranchMode" NOT NULL DEFAULT 'SINGLE';

-- CreateIndex
CREATE INDEX "Tenant_branchMode_idx" ON "Tenant"("branchMode");
