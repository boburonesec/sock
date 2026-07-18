CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "recipientUserId" TEXT NOT NULL, "type" TEXT NOT NULL,
  "title" TEXT NOT NULL, "body" TEXT NOT NULL, "sourceType" TEXT, "sourceId" TEXT, "dedupeKey" TEXT NOT NULL, "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Notification_id_tenantId_key" ON "Notification"("id", "tenantId");
CREATE UNIQUE INDEX "Notification_tenantId_dedupeKey_key" ON "Notification"("tenantId", "dedupeKey");
CREATE INDEX "Notification_tenantId_recipientUserId_readAt_createdAt_idx" ON "Notification"("tenantId", "recipientUserId", "readAt", "createdAt");

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "notificationId" TEXT NOT NULL, "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "telegramChatId" TEXT, "attemptCount" INTEGER NOT NULL DEFAULT 0, "leaseUntil" TIMESTAMP(3), "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT, "sentAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationDelivery_id_tenantId_key" ON "NotificationDelivery"("id", "tenantId");
CREATE UNIQUE INDEX "NotificationDelivery_tenantId_notificationId_key" ON "NotificationDelivery"("tenantId", "notificationId");
CREATE INDEX "NotificationDelivery_status_nextAttemptAt_leaseUntil_idx" ON "NotificationDelivery"("status", "nextAttemptAt", "leaseUntil");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_tenantId_fkey" FOREIGN KEY ("recipientUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_tenantId_fkey" FOREIGN KEY ("notificationId", "tenantId") REFERENCES "Notification"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
