-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PILOT', 'ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TenantSubscriptionStatus" AS ENUM ('NONE', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlatformAdminStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UserAccessTokenType" AS ENUM ('INVITE', 'PASSWORD_RESET');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "pilotEndsAt" TIMESTAMP(3),
ADD COLUMN     "pilotStartedAt" TIMESTAMP(3),
ADD COLUMN     "planCode" TEXT,
ADD COLUMN     "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "subscriptionStatus" "TenantSubscriptionStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PlatformAdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAdminCredential" (
    "id" TEXT NOT NULL,
    "platformAdminId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAdminCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformRefreshSession" (
    "id" TEXT NOT NULL,
    "platformAdminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformRefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccessToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "UserAccessTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByPlatformAdminId" TEXT,
    "createdByUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "platformAdminId" TEXT,
    "tenantId" TEXT,
    "factoryId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformAdmin_status_deletedAt_idx" ON "PlatformAdmin"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "PlatformAdmin_deletedAt_idx" ON "PlatformAdmin"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_email_key" ON "PlatformAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdminCredential_platformAdminId_key" ON "PlatformAdminCredential"("platformAdminId");

-- CreateIndex
CREATE INDEX "PlatformRefreshSession_platformAdminId_idx" ON "PlatformRefreshSession"("platformAdminId");

-- CreateIndex
CREATE INDEX "PlatformRefreshSession_expiresAt_idx" ON "PlatformRefreshSession"("expiresAt");

-- CreateIndex
CREATE INDEX "PlatformRefreshSession_revokedAt_idx" ON "PlatformRefreshSession"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRefreshSession_tokenHash_key" ON "PlatformRefreshSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserAccessToken_tenantId_userId_type_idx" ON "UserAccessToken"("tenantId", "userId", "type");

-- CreateIndex
CREATE INDEX "UserAccessToken_expiresAt_idx" ON "UserAccessToken"("expiresAt");

-- CreateIndex
CREATE INDEX "UserAccessToken_usedAt_idx" ON "UserAccessToken"("usedAt");

-- CreateIndex
CREATE INDEX "UserAccessToken_revokedAt_idx" ON "UserAccessToken"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccessToken_tokenHash_key" ON "UserAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_createdAt_idx" ON "PlatformAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_platformAdminId_createdAt_idx" ON "PlatformAuditLog"("platformAdminId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_tenantId_createdAt_idx" ON "PlatformAuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_factoryId_createdAt_idx" ON "PlatformAuditLog"("factoryId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_action_idx" ON "PlatformAuditLog"("action");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_entityType_entityId_idx" ON "PlatformAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "Tenant_subscriptionStatus_idx" ON "Tenant"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "Tenant_planCode_idx" ON "Tenant"("planCode");

-- AddForeignKey
ALTER TABLE "PlatformAdminCredential" ADD CONSTRAINT "PlatformAdminCredential_platformAdminId_fkey" FOREIGN KEY ("platformAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRefreshSession" ADD CONSTRAINT "PlatformRefreshSession_platformAdminId_fkey" FOREIGN KEY ("platformAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessToken" ADD CONSTRAINT "UserAccessToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessToken" ADD CONSTRAINT "UserAccessToken_userId_tenantId_fkey" FOREIGN KEY ("userId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessToken" ADD CONSTRAINT "UserAccessToken_createdByPlatformAdminId_fkey" FOREIGN KEY ("createdByPlatformAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessToken" ADD CONSTRAINT "UserAccessToken_createdByUserId_tenantId_fkey" FOREIGN KEY ("createdByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_platformAdminId_fkey" FOREIGN KEY ("platformAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
