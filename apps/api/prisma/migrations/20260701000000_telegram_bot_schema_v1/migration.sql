-- CreateEnum
CREATE TYPE "TelegramAccountType" AS ENUM ('EMPLOYEE', 'CLIENT', 'USER');

-- CreateEnum
CREATE TYPE "TelegramAccountStatus" AS ENUM ('ACTIVE', 'UNLINKED', 'BLOCKED');

-- AlterTable
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_id_tenantId_key" UNIQUE ("id", "tenantId");

-- CreateTable
CREATE TABLE "TelegramAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "type" "TelegramAccountType" NOT NULL,
    "employeeId" TEXT,
    "clientId" TEXT,
    "userId" TEXT,
    "status" "TelegramAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinkedAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramLinkToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "targetType" "TelegramAccountType" NOT NULL,
    "employeeId" TEXT,
    "clientId" TEXT,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramAccount_telegramUserId_key" ON "TelegramAccount"("telegramUserId");

-- CreateIndex
CREATE INDEX "TelegramAccount_telegramUserId_idx" ON "TelegramAccount"("telegramUserId");

-- CreateIndex
CREATE INDEX "TelegramAccount_tenantId_status_idx" ON "TelegramAccount"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TelegramAccount_tenantId_employeeId_idx" ON "TelegramAccount"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "TelegramAccount_tenantId_clientId_idx" ON "TelegramAccount"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "TelegramAccount_tenantId_userId_idx" ON "TelegramAccount"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLinkToken_codeHash_key" ON "TelegramLinkToken"("codeHash");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_codeHash_idx" ON "TelegramLinkToken"("codeHash");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_tenantId_targetType_idx" ON "TelegramLinkToken"("tenantId", "targetType");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_tenantId_employeeId_idx" ON "TelegramLinkToken"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_tenantId_clientId_idx" ON "TelegramLinkToken"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_tenantId_userId_idx" ON "TelegramLinkToken"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_expiresAt_idx" ON "TelegramLinkToken"("expiresAt");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_usedAt_idx" ON "TelegramLinkToken"("usedAt");

-- AddForeignKey
ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_employeeId_tenantId_fkey" FOREIGN KEY ("employeeId", "tenantId") REFERENCES "Employee"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_clientId_tenantId_fkey" FOREIGN KEY ("clientId", "tenantId") REFERENCES "Client"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_userId_tenantId_fkey" FOREIGN KEY ("userId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_employeeId_tenantId_fkey" FOREIGN KEY ("employeeId", "tenantId") REFERENCES "Employee"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_clientId_tenantId_fkey" FOREIGN KEY ("clientId", "tenantId") REFERENCES "Client"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_userId_tenantId_fkey" FOREIGN KEY ("userId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_createdByUserId_tenantId_fkey" FOREIGN KEY ("createdByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
