-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StockMovementItemType" AS ENUM ('PRODUCT', 'MATERIAL');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIPT', 'ISSUE', 'PRODUCTION_RECEIPT', 'TRANSFER', 'RETURN', 'CORRECTION');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'WAITING_PRODUCTION', 'READY', 'DELIVERED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmployeeAdjustmentType" AS ENUM ('BONUS', 'PENALTY', 'ADVANCE');

-- CreateEnum
CREATE TYPE "EmployeeAdjustmentStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PAID', 'APPLIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('DRAFT', 'CALCULATED', 'PARTIALLY_PAID', 'PAID', 'CLOSED');

-- CreateEnum
CREATE TYPE "PayrollItemStatus" AS ENUM ('CALCULATED', 'PARTIALLY_PAID', 'PAID', 'CARRIED_FORWARD');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Factory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseZone" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WarehouseZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFactoryAccess" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFactoryAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Color" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionStage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductionStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryRate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "productionStageId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SalaryRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LowStockThreshold" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LowStockThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageInventory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "productionStageId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StageInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageMovement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "sourceStageId" TEXT NOT NULL,
    "destinationStageId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "productionBatchId" TEXT,
    "quantity" INTEGER NOT NULL,
    "recordedByUserId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "productionStageId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "salaryRateAmount" DECIMAL(14,2) NOT NULL,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "enteredByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Defect" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "employeeId" TEXT,
    "productionStageId" TEXT,
    "productVariantId" TEXT,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reportedByUserId" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Defect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "warehouseZoneId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialStock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "warehouseZoneId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "warehouseZoneId" TEXT NOT NULL,
    "itemType" "StockMovementItemType" NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "productVariantId" TEXT,
    "materialId" TEXT,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "beforeQuantity" DECIMAL(14,3),
    "afterQuantity" DECIMAL(14,3),
    "reason" TEXT,
    "note" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "deadline" TIMESTAMP(3),
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "totalPrice" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "recordedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPaymentAllocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPurchase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT,
    "supplierId" TEXT NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "SupplierPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPurchaseItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "totalPrice" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "recordedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPaymentAllocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "paidByUserId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseApproval" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAdjustment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "EmployeeAdjustmentType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "EmployeeAdjustmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "paidByUserId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "payrollPeriodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "EmployeeAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "totalWorkedAmount" DECIMAL(14,2) NOT NULL,
    "totalBonusAmount" DECIMAL(14,2) NOT NULL,
    "totalPenaltyAmount" DECIMAL(14,2) NOT NULL,
    "totalAdvanceAmount" DECIMAL(14,2) NOT NULL,
    "totalFinalAmount" DECIMAL(14,2) NOT NULL,
    "totalPaidAmount" DECIMAL(14,2) NOT NULL,
    "totalRemainingAmount" DECIMAL(14,2) NOT NULL,
    "calculatedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workedAmount" DECIMAL(14,2) NOT NULL,
    "bonusAmount" DECIMAL(14,2) NOT NULL,
    "penaltyAmount" DECIMAL(14,2) NOT NULL,
    "advanceAmount" DECIMAL(14,2) NOT NULL,
    "finalAmount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL,
    "remainingAmount" DECIMAL(14,2) NOT NULL,
    "status" "PayrollItemStatus" NOT NULL DEFAULT 'CALCULATED',
    "calculationSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollItemId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paidByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tenant_deletedAt_idx" ON "Tenant"("deletedAt");

-- CreateIndex
CREATE INDEX "Factory_tenantId_deletedAt_idx" ON "Factory"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Factory_id_tenantId_key" ON "Factory"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Factory_tenantId_name_key" ON "Factory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Warehouse_tenantId_factoryId_deletedAt_idx" ON "Warehouse"("tenantId", "factoryId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_id_tenantId_key" ON "Warehouse"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_id_tenantId_factoryId_key" ON "Warehouse"("id", "tenantId", "factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_factoryId_name_key" ON "Warehouse"("factoryId", "name");

-- CreateIndex
CREATE INDEX "WarehouseZone_tenantId_warehouseId_deletedAt_idx" ON "WarehouseZone"("tenantId", "warehouseId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseZone_id_tenantId_warehouseId_key" ON "WarehouseZone"("id", "tenantId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseZone_warehouseId_name_key" ON "WarehouseZone"("warehouseId", "name");

-- CreateIndex
CREATE INDEX "User_tenantId_deletedAt_idx" ON "User"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_tenantId_key" ON "User"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Role_tenantId_deletedAt_idx" ON "Role"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_id_tenantId_key" ON "Role"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_name_key" ON "Role"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "RolePermission_tenantId_permissionId_idx" ON "RolePermission"("tenantId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_tenantId_roleId_permissionId_key" ON "RolePermission"("tenantId", "roleId", "permissionId");

-- CreateIndex
CREATE INDEX "UserRole_tenantId_roleId_idx" ON "UserRole"("tenantId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_tenantId_userId_roleId_key" ON "UserRole"("tenantId", "userId", "roleId");

-- CreateIndex
CREATE INDEX "UserFactoryAccess_tenantId_factoryId_idx" ON "UserFactoryAccess"("tenantId", "factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFactoryAccess_tenantId_userId_factoryId_key" ON "UserFactoryAccess"("tenantId", "userId", "factoryId");

-- CreateIndex
CREATE INDEX "Product_tenantId_deletedAt_idx" ON "Product"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_id_tenantId_key" ON "Product"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_name_key" ON "Product"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_code_key" ON "Product"("tenantId", "code");

-- CreateIndex
CREATE INDEX "ProductVariant_tenantId_productId_deletedAt_idx" ON "ProductVariant"("tenantId", "productId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_id_tenantId_key" ON "ProductVariant"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_tenantId_productId_colorId_materialId_season_key" ON "ProductVariant"("tenantId", "productId", "colorId", "materialId", "seasonId");

-- CreateIndex
CREATE INDEX "Color_tenantId_deletedAt_idx" ON "Color"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Color_id_tenantId_key" ON "Color"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Color_tenantId_name_key" ON "Color"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Color_tenantId_code_key" ON "Color"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Material_tenantId_deletedAt_idx" ON "Material"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Material_id_tenantId_key" ON "Material"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_tenantId_name_key" ON "Material"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Material_tenantId_code_key" ON "Material"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Season_tenantId_deletedAt_idx" ON "Season"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Season_id_tenantId_key" ON "Season"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_tenantId_name_key" ON "Season"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Season_tenantId_code_key" ON "Season"("tenantId", "code");

-- CreateIndex
CREATE INDEX "ProductPrice_tenantId_productId_effectiveFrom_idx" ON "ProductPrice"("tenantId", "productId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ProductPrice_tenantId_productVariantId_effectiveFrom_idx" ON "ProductPrice"("tenantId", "productVariantId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ProductionStage_tenantId_factoryId_deletedAt_idx" ON "ProductionStage"("tenantId", "factoryId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionStage_id_tenantId_key" ON "ProductionStage"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionStage_id_tenantId_factoryId_key" ON "ProductionStage"("id", "tenantId", "factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionStage_factoryId_name_key" ON "ProductionStage"("factoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionStage_factoryId_sortOrder_key" ON "ProductionStage"("factoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "SalaryRate_tenantId_factoryId_productionStageId_effectiveFr_idx" ON "SalaryRate"("tenantId", "factoryId", "productionStageId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "SalaryRate_tenantId_productVariantId_effectiveFrom_idx" ON "SalaryRate"("tenantId", "productVariantId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ExpenseCategory_tenantId_deletedAt_idx" ON "ExpenseCategory"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_id_tenantId_key" ON "ExpenseCategory"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_tenantId_name_key" ON "ExpenseCategory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "LowStockThreshold_tenantId_materialId_deletedAt_idx" ON "LowStockThreshold"("tenantId", "materialId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LowStockThreshold_tenantId_warehouseId_materialId_key" ON "LowStockThreshold"("tenantId", "warehouseId", "materialId");

-- CreateIndex
CREATE INDEX "Employee_tenantId_factoryId_status_idx" ON "Employee"("tenantId", "factoryId", "status");

-- CreateIndex
CREATE INDEX "Employee_tenantId_factoryId_deletedAt_idx" ON "Employee"("tenantId", "factoryId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_id_tenantId_factoryId_key" ON "Employee"("id", "tenantId", "factoryId");

-- CreateIndex
CREATE INDEX "StageInventory_tenantId_factoryId_productionStageId_idx" ON "StageInventory"("tenantId", "factoryId", "productionStageId");

-- CreateIndex
CREATE INDEX "StageInventory_tenantId_productVariantId_idx" ON "StageInventory"("tenantId", "productVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "StageInventory_tenantId_factoryId_productionStageId_product_key" ON "StageInventory"("tenantId", "factoryId", "productionStageId", "productVariantId");

-- CreateIndex
CREATE INDEX "ProductionBatch_tenantId_factoryId_createdAt_idx" ON "ProductionBatch"("tenantId", "factoryId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductionBatch_tenantId_productVariantId_idx" ON "ProductionBatch"("tenantId", "productVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBatch_id_tenantId_factoryId_key" ON "ProductionBatch"("id", "tenantId", "factoryId");

-- CreateIndex
CREATE INDEX "StageMovement_tenantId_factoryId_occurredAt_idx" ON "StageMovement"("tenantId", "factoryId", "occurredAt");

-- CreateIndex
CREATE INDEX "StageMovement_tenantId_factoryId_sourceStageId_occurredAt_idx" ON "StageMovement"("tenantId", "factoryId", "sourceStageId", "occurredAt");

-- CreateIndex
CREATE INDEX "StageMovement_tenantId_factoryId_destinationStageId_occurre_idx" ON "StageMovement"("tenantId", "factoryId", "destinationStageId", "occurredAt");

-- CreateIndex
CREATE INDEX "StageMovement_tenantId_productVariantId_idx" ON "StageMovement"("tenantId", "productVariantId");

-- CreateIndex
CREATE INDEX "StageMovement_tenantId_productionBatchId_idx" ON "StageMovement"("tenantId", "productionBatchId");

-- CreateIndex
CREATE INDEX "WorkerActivity_tenantId_factoryId_employeeId_activityDate_idx" ON "WorkerActivity"("tenantId", "factoryId", "employeeId", "activityDate");

-- CreateIndex
CREATE INDEX "WorkerActivity_tenantId_factoryId_productionStageId_activit_idx" ON "WorkerActivity"("tenantId", "factoryId", "productionStageId", "activityDate");

-- CreateIndex
CREATE INDEX "WorkerActivity_tenantId_productVariantId_idx" ON "WorkerActivity"("tenantId", "productVariantId");

-- CreateIndex
CREATE INDEX "Defect_tenantId_factoryId_detectedAt_idx" ON "Defect"("tenantId", "factoryId", "detectedAt");

-- CreateIndex
CREATE INDEX "Defect_tenantId_factoryId_productionStageId_detectedAt_idx" ON "Defect"("tenantId", "factoryId", "productionStageId", "detectedAt");

-- CreateIndex
CREATE INDEX "Defect_tenantId_factoryId_employeeId_detectedAt_idx" ON "Defect"("tenantId", "factoryId", "employeeId", "detectedAt");

-- CreateIndex
CREATE INDEX "Defect_tenantId_productVariantId_idx" ON "Defect"("tenantId", "productVariantId");

-- CreateIndex
CREATE INDEX "Stock_tenantId_factoryId_warehouseId_warehouseZoneId_idx" ON "Stock"("tenantId", "factoryId", "warehouseId", "warehouseZoneId");

-- CreateIndex
CREATE INDEX "Stock_tenantId_productVariantId_idx" ON "Stock"("tenantId", "productVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_tenantId_warehouseId_warehouseZoneId_productVariantId_key" ON "Stock"("tenantId", "warehouseId", "warehouseZoneId", "productVariantId");

-- CreateIndex
CREATE INDEX "MaterialStock_tenantId_factoryId_warehouseId_warehouseZoneI_idx" ON "MaterialStock"("tenantId", "factoryId", "warehouseId", "warehouseZoneId");

-- CreateIndex
CREATE INDEX "MaterialStock_tenantId_materialId_idx" ON "MaterialStock"("tenantId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialStock_tenantId_warehouseId_warehouseZoneId_material_key" ON "MaterialStock"("tenantId", "warehouseId", "warehouseZoneId", "materialId");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_factoryId_occurredAt_idx" ON "StockMovement"("tenantId", "factoryId", "occurredAt");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_warehouseId_warehouseZoneId_occurred_idx" ON "StockMovement"("tenantId", "warehouseId", "warehouseZoneId", "occurredAt");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_productVariantId_occurredAt_idx" ON "StockMovement"("tenantId", "productVariantId", "occurredAt");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_materialId_occurredAt_idx" ON "StockMovement"("tenantId", "materialId", "occurredAt");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_itemType_movementType_occurredAt_idx" ON "StockMovement"("tenantId", "itemType", "movementType", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entityType_entityId_idx" ON "AuditLog"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_idx" ON "AuditLog"("tenantId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_factoryId_createdAt_idx" ON "AuditLog"("factoryId", "createdAt");

-- CreateIndex
CREATE INDEX "Client_tenantId_status_deletedAt_idx" ON "Client"("tenantId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "Client_tenantId_phone_idx" ON "Client"("tenantId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Client_id_tenantId_key" ON "Client"("id", "tenantId");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_clientId_idx" ON "SalesOrder"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_factoryId_idx" ON "SalesOrder"("tenantId", "factoryId");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_status_idx" ON "SalesOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_factoryId_status_deadline_idx" ON "SalesOrder"("tenantId", "factoryId", "status", "deadline");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_id_tenantId_key" ON "SalesOrder"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_tenantId_orderNumber_key" ON "SalesOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "SalesOrderItem_tenantId_orderId_idx" ON "SalesOrderItem"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "SalesOrderItem_tenantId_productVariantId_idx" ON "SalesOrderItem"("tenantId", "productVariantId");

-- CreateIndex
CREATE INDEX "ClientPayment_tenantId_paymentDate_idx" ON "ClientPayment"("tenantId", "paymentDate");

-- CreateIndex
CREATE INDEX "ClientPayment_tenantId_clientId_paymentDate_idx" ON "ClientPayment"("tenantId", "clientId", "paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPayment_id_tenantId_key" ON "ClientPayment"("id", "tenantId");

-- CreateIndex
CREATE INDEX "ClientPaymentAllocation_tenantId_paymentId_idx" ON "ClientPaymentAllocation"("tenantId", "paymentId");

-- CreateIndex
CREATE INDEX "ClientPaymentAllocation_tenantId_orderId_idx" ON "ClientPaymentAllocation"("tenantId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPaymentAllocation_tenantId_paymentId_orderId_key" ON "ClientPaymentAllocation"("tenantId", "paymentId", "orderId");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_status_deletedAt_idx" ON "Supplier"("tenantId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_phone_idx" ON "Supplier"("tenantId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_id_tenantId_key" ON "Supplier"("id", "tenantId");

-- CreateIndex
CREATE INDEX "SupplierPurchase_tenantId_supplierId_idx" ON "SupplierPurchase"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "SupplierPurchase_tenantId_factoryId_idx" ON "SupplierPurchase"("tenantId", "factoryId");

-- CreateIndex
CREATE INDEX "SupplierPurchase_tenantId_supplierId_purchasedAt_idx" ON "SupplierPurchase"("tenantId", "supplierId", "purchasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPurchase_id_tenantId_key" ON "SupplierPurchase"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPurchase_tenantId_purchaseNumber_key" ON "SupplierPurchase"("tenantId", "purchaseNumber");

-- CreateIndex
CREATE INDEX "SupplierPurchaseItem_tenantId_purchaseId_idx" ON "SupplierPurchaseItem"("tenantId", "purchaseId");

-- CreateIndex
CREATE INDEX "SupplierPurchaseItem_tenantId_materialId_idx" ON "SupplierPurchaseItem"("tenantId", "materialId");

-- CreateIndex
CREATE INDEX "SupplierPayment_tenantId_paymentDate_idx" ON "SupplierPayment"("tenantId", "paymentDate");

-- CreateIndex
CREATE INDEX "SupplierPayment_tenantId_supplierId_paymentDate_idx" ON "SupplierPayment"("tenantId", "supplierId", "paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_id_tenantId_key" ON "SupplierPayment"("id", "tenantId");

-- CreateIndex
CREATE INDEX "SupplierPaymentAllocation_tenantId_paymentId_idx" ON "SupplierPaymentAllocation"("tenantId", "paymentId");

-- CreateIndex
CREATE INDEX "SupplierPaymentAllocation_tenantId_purchaseId_idx" ON "SupplierPaymentAllocation"("tenantId", "purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPaymentAllocation_tenantId_paymentId_purchaseId_key" ON "SupplierPaymentAllocation"("tenantId", "paymentId", "purchaseId");

-- CreateIndex
CREATE INDEX "Expense_tenantId_categoryId_idx" ON "Expense"("tenantId", "categoryId");

-- CreateIndex
CREATE INDEX "Expense_tenantId_status_idx" ON "Expense"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Expense_tenantId_factoryId_idx" ON "Expense"("tenantId", "factoryId");

-- CreateIndex
CREATE INDEX "Expense_tenantId_createdAt_idx" ON "Expense"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_id_tenantId_key" ON "Expense"("id", "tenantId");

-- CreateIndex
CREATE INDEX "ExpenseApproval_tenantId_expenseId_idx" ON "ExpenseApproval"("tenantId", "expenseId");

-- CreateIndex
CREATE INDEX "ExpenseApproval_tenantId_action_idx" ON "ExpenseApproval"("tenantId", "action");

-- CreateIndex
CREATE INDEX "ExpenseApproval_tenantId_createdAt_idx" ON "ExpenseApproval"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "EmployeeAdjustment_tenantId_factoryId_employeeId_idx" ON "EmployeeAdjustment"("tenantId", "factoryId", "employeeId");

-- CreateIndex
CREATE INDEX "EmployeeAdjustment_tenantId_status_idx" ON "EmployeeAdjustment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "EmployeeAdjustment_tenantId_type_idx" ON "EmployeeAdjustment"("tenantId", "type");

-- CreateIndex
CREATE INDEX "EmployeeAdjustment_tenantId_createdAt_idx" ON "EmployeeAdjustment"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PayrollPeriod_tenantId_status_idx" ON "PayrollPeriod"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PayrollPeriod_tenantId_factoryId_month_idx" ON "PayrollPeriod"("tenantId", "factoryId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_id_tenantId_factoryId_key" ON "PayrollPeriod"("id", "tenantId", "factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_tenantId_factoryId_month_key" ON "PayrollPeriod"("tenantId", "factoryId", "month");

-- CreateIndex
CREATE INDEX "PayrollItem_tenantId_employeeId_idx" ON "PayrollItem"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "PayrollItem_tenantId_status_idx" ON "PayrollItem"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PayrollItem_tenantId_factoryId_payrollPeriodId_idx" ON "PayrollItem"("tenantId", "factoryId", "payrollPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_id_tenantId_key" ON "PayrollItem"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_tenantId_payrollPeriodId_employeeId_key" ON "PayrollItem"("tenantId", "payrollPeriodId", "employeeId");

-- CreateIndex
CREATE INDEX "PayrollPayment_tenantId_payrollItemId_idx" ON "PayrollPayment"("tenantId", "payrollItemId");

-- CreateIndex
CREATE INDEX "PayrollPayment_tenantId_paidAt_idx" ON "PayrollPayment"("tenantId", "paidAt");

-- AddForeignKey
ALTER TABLE "Factory" ADD CONSTRAINT "Factory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseZone" ADD CONSTRAINT "WarehouseZone_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseZone" ADD CONSTRAINT "WarehouseZone_warehouseId_tenantId_fkey" FOREIGN KEY ("warehouseId", "tenantId") REFERENCES "Warehouse"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_tenantId_fkey" FOREIGN KEY ("roleId", "tenantId") REFERENCES "Role"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_tenantId_fkey" FOREIGN KEY ("userId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_tenantId_fkey" FOREIGN KEY ("roleId", "tenantId") REFERENCES "Role"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFactoryAccess" ADD CONSTRAINT "UserFactoryAccess_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFactoryAccess" ADD CONSTRAINT "UserFactoryAccess_userId_tenantId_fkey" FOREIGN KEY ("userId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFactoryAccess" ADD CONSTRAINT "UserFactoryAccess_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_colorId_tenantId_fkey" FOREIGN KEY ("colorId", "tenantId") REFERENCES "Color"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_materialId_tenantId_fkey" FOREIGN KEY ("materialId", "tenantId") REFERENCES "Material"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_seasonId_tenantId_fkey" FOREIGN KEY ("seasonId", "tenantId") REFERENCES "Season"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Color" ADD CONSTRAINT "Color_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productVariantId_tenantId_fkey" FOREIGN KEY ("productVariantId", "tenantId") REFERENCES "ProductVariant"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionStage" ADD CONSTRAINT "ProductionStage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionStage" ADD CONSTRAINT "ProductionStage_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRate" ADD CONSTRAINT "SalaryRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRate" ADD CONSTRAINT "SalaryRate_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRate" ADD CONSTRAINT "SalaryRate_productionStageId_tenantId_factoryId_fkey" FOREIGN KEY ("productionStageId", "tenantId", "factoryId") REFERENCES "ProductionStage"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRate" ADD CONSTRAINT "SalaryRate_productVariantId_tenantId_fkey" FOREIGN KEY ("productVariantId", "tenantId") REFERENCES "ProductVariant"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LowStockThreshold" ADD CONSTRAINT "LowStockThreshold_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LowStockThreshold" ADD CONSTRAINT "LowStockThreshold_warehouseId_tenantId_fkey" FOREIGN KEY ("warehouseId", "tenantId") REFERENCES "Warehouse"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LowStockThreshold" ADD CONSTRAINT "LowStockThreshold_materialId_tenantId_fkey" FOREIGN KEY ("materialId", "tenantId") REFERENCES "Material"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageInventory" ADD CONSTRAINT "StageInventory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageInventory" ADD CONSTRAINT "StageInventory_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageInventory" ADD CONSTRAINT "StageInventory_productionStageId_tenantId_factoryId_fkey" FOREIGN KEY ("productionStageId", "tenantId", "factoryId") REFERENCES "ProductionStage"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageInventory" ADD CONSTRAINT "StageInventory_productVariantId_tenantId_fkey" FOREIGN KEY ("productVariantId", "tenantId") REFERENCES "ProductVariant"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_productVariantId_tenantId_fkey" FOREIGN KEY ("productVariantId", "tenantId") REFERENCES "ProductVariant"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_createdByUserId_tenantId_fkey" FOREIGN KEY ("createdByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageMovement" ADD CONSTRAINT "StageMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageMovement" ADD CONSTRAINT "StageMovement_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageMovement" ADD CONSTRAINT "StageMovement_sourceStageId_tenantId_factoryId_fkey" FOREIGN KEY ("sourceStageId", "tenantId", "factoryId") REFERENCES "ProductionStage"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageMovement" ADD CONSTRAINT "StageMovement_destinationStageId_tenantId_factoryId_fkey" FOREIGN KEY ("destinationStageId", "tenantId", "factoryId") REFERENCES "ProductionStage"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageMovement" ADD CONSTRAINT "StageMovement_productVariantId_tenantId_fkey" FOREIGN KEY ("productVariantId", "tenantId") REFERENCES "ProductVariant"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageMovement" ADD CONSTRAINT "StageMovement_productionBatchId_tenantId_factoryId_fkey" FOREIGN KEY ("productionBatchId", "tenantId", "factoryId") REFERENCES "ProductionBatch"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageMovement" ADD CONSTRAINT "StageMovement_recordedByUserId_tenantId_fkey" FOREIGN KEY ("recordedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerActivity" ADD CONSTRAINT "WorkerActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerActivity" ADD CONSTRAINT "WorkerActivity_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerActivity" ADD CONSTRAINT "WorkerActivity_employeeId_tenantId_factoryId_fkey" FOREIGN KEY ("employeeId", "tenantId", "factoryId") REFERENCES "Employee"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerActivity" ADD CONSTRAINT "WorkerActivity_productionStageId_tenantId_factoryId_fkey" FOREIGN KEY ("productionStageId", "tenantId", "factoryId") REFERENCES "ProductionStage"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerActivity" ADD CONSTRAINT "WorkerActivity_productVariantId_tenantId_fkey" FOREIGN KEY ("productVariantId", "tenantId") REFERENCES "ProductVariant"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerActivity" ADD CONSTRAINT "WorkerActivity_enteredByUserId_tenantId_fkey" FOREIGN KEY ("enteredByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_employeeId_tenantId_factoryId_fkey" FOREIGN KEY ("employeeId", "tenantId", "factoryId") REFERENCES "Employee"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_productionStageId_tenantId_factoryId_fkey" FOREIGN KEY ("productionStageId", "tenantId", "factoryId") REFERENCES "ProductionStage"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_productVariantId_tenantId_fkey" FOREIGN KEY ("productVariantId", "tenantId") REFERENCES "ProductVariant"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_reportedByUserId_tenantId_fkey" FOREIGN KEY ("reportedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_warehouseId_tenantId_factoryId_fkey" FOREIGN KEY ("warehouseId", "tenantId", "factoryId") REFERENCES "Warehouse"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_warehouseZoneId_tenantId_warehouseId_fkey" FOREIGN KEY ("warehouseZoneId", "tenantId", "warehouseId") REFERENCES "WarehouseZone"("id", "tenantId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_productVariantId_tenantId_fkey" FOREIGN KEY ("productVariantId", "tenantId") REFERENCES "ProductVariant"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialStock" ADD CONSTRAINT "MaterialStock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialStock" ADD CONSTRAINT "MaterialStock_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialStock" ADD CONSTRAINT "MaterialStock_warehouseId_tenantId_factoryId_fkey" FOREIGN KEY ("warehouseId", "tenantId", "factoryId") REFERENCES "Warehouse"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialStock" ADD CONSTRAINT "MaterialStock_warehouseZoneId_tenantId_warehouseId_fkey" FOREIGN KEY ("warehouseZoneId", "tenantId", "warehouseId") REFERENCES "WarehouseZone"("id", "tenantId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialStock" ADD CONSTRAINT "MaterialStock_materialId_tenantId_fkey" FOREIGN KEY ("materialId", "tenantId") REFERENCES "Material"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_tenantId_factoryId_fkey" FOREIGN KEY ("warehouseId", "tenantId", "factoryId") REFERENCES "Warehouse"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseZoneId_tenantId_warehouseId_fkey" FOREIGN KEY ("warehouseZoneId", "tenantId", "warehouseId") REFERENCES "WarehouseZone"("id", "tenantId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productVariantId_tenantId_fkey" FOREIGN KEY ("productVariantId", "tenantId") REFERENCES "ProductVariant"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_materialId_tenantId_fkey" FOREIGN KEY ("materialId", "tenantId") REFERENCES "Material"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_recordedByUserId_tenantId_fkey" FOREIGN KEY ("recordedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_tenantId_fkey" FOREIGN KEY ("userId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_clientId_tenantId_fkey" FOREIGN KEY ("clientId", "tenantId") REFERENCES "Client"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_createdByUserId_tenantId_fkey" FOREIGN KEY ("createdByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_orderId_tenantId_fkey" FOREIGN KEY ("orderId", "tenantId") REFERENCES "SalesOrder"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_productVariantId_tenantId_fkey" FOREIGN KEY ("productVariantId", "tenantId") REFERENCES "ProductVariant"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_clientId_tenantId_fkey" FOREIGN KEY ("clientId", "tenantId") REFERENCES "Client"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_recordedByUserId_tenantId_fkey" FOREIGN KEY ("recordedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPaymentAllocation" ADD CONSTRAINT "ClientPaymentAllocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPaymentAllocation" ADD CONSTRAINT "ClientPaymentAllocation_paymentId_tenantId_fkey" FOREIGN KEY ("paymentId", "tenantId") REFERENCES "ClientPayment"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPaymentAllocation" ADD CONSTRAINT "ClientPaymentAllocation_orderId_tenantId_fkey" FOREIGN KEY ("orderId", "tenantId") REFERENCES "SalesOrder"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchase" ADD CONSTRAINT "SupplierPurchase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchase" ADD CONSTRAINT "SupplierPurchase_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchase" ADD CONSTRAINT "SupplierPurchase_supplierId_tenantId_fkey" FOREIGN KEY ("supplierId", "tenantId") REFERENCES "Supplier"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchase" ADD CONSTRAINT "SupplierPurchase_createdByUserId_tenantId_fkey" FOREIGN KEY ("createdByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchaseItem" ADD CONSTRAINT "SupplierPurchaseItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchaseItem" ADD CONSTRAINT "SupplierPurchaseItem_purchaseId_tenantId_fkey" FOREIGN KEY ("purchaseId", "tenantId") REFERENCES "SupplierPurchase"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchaseItem" ADD CONSTRAINT "SupplierPurchaseItem_materialId_tenantId_fkey" FOREIGN KEY ("materialId", "tenantId") REFERENCES "Material"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_tenantId_fkey" FOREIGN KEY ("supplierId", "tenantId") REFERENCES "Supplier"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_recordedByUserId_tenantId_fkey" FOREIGN KEY ("recordedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_paymentId_tenantId_fkey" FOREIGN KEY ("paymentId", "tenantId") REFERENCES "SupplierPayment"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_purchaseId_tenantId_fkey" FOREIGN KEY ("purchaseId", "tenantId") REFERENCES "SupplierPurchase"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_tenantId_fkey" FOREIGN KEY ("categoryId", "tenantId") REFERENCES "ExpenseCategory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_requestedByUserId_tenantId_fkey" FOREIGN KEY ("requestedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_approvedByUserId_tenantId_fkey" FOREIGN KEY ("approvedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidByUserId_tenantId_fkey" FOREIGN KEY ("paidByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApproval" ADD CONSTRAINT "ExpenseApproval_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApproval" ADD CONSTRAINT "ExpenseApproval_expenseId_tenantId_fkey" FOREIGN KEY ("expenseId", "tenantId") REFERENCES "Expense"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApproval" ADD CONSTRAINT "ExpenseApproval_actorUserId_tenantId_fkey" FOREIGN KEY ("actorUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdjustment" ADD CONSTRAINT "EmployeeAdjustment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdjustment" ADD CONSTRAINT "EmployeeAdjustment_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdjustment" ADD CONSTRAINT "EmployeeAdjustment_employeeId_tenantId_factoryId_fkey" FOREIGN KEY ("employeeId", "tenantId", "factoryId") REFERENCES "Employee"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdjustment" ADD CONSTRAINT "EmployeeAdjustment_requestedByUserId_tenantId_fkey" FOREIGN KEY ("requestedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdjustment" ADD CONSTRAINT "EmployeeAdjustment_approvedByUserId_tenantId_fkey" FOREIGN KEY ("approvedByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdjustment" ADD CONSTRAINT "EmployeeAdjustment_paidByUserId_tenantId_fkey" FOREIGN KEY ("paidByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAdjustment" ADD CONSTRAINT "EmployeeAdjustment_payrollPeriodId_tenantId_factoryId_fkey" FOREIGN KEY ("payrollPeriodId", "tenantId", "factoryId") REFERENCES "PayrollPeriod"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_factoryId_tenantId_fkey" FOREIGN KEY ("factoryId", "tenantId") REFERENCES "Factory"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollPeriodId_tenantId_factoryId_fkey" FOREIGN KEY ("payrollPeriodId", "tenantId", "factoryId") REFERENCES "PayrollPeriod"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_tenantId_factoryId_fkey" FOREIGN KEY ("employeeId", "tenantId", "factoryId") REFERENCES "Employee"("id", "tenantId", "factoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_payrollItemId_tenantId_fkey" FOREIGN KEY ("payrollItemId", "tenantId") REFERENCES "PayrollItem"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_paidByUserId_tenantId_fkey" FOREIGN KEY ("paidByUserId", "tenantId") REFERENCES "User"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
