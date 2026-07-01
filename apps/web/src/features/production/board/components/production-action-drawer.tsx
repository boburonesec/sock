import { AlertTriangle, ArrowRightLeft, ClipboardPlus, PackageCheck, Plus } from "lucide-react";
import { Drawer } from "@/components/overlays/drawer";
import type {
  CreateDefectPayload,
  CreateProductionBatchPayload,
  CreateStageMovementPayload,
  CreateWorkerActivityPayload,
} from "@/lib/api/production";
import type { FinishedProductReceiptPayload } from "@/lib/api/warehouse";
import {
  ProductionActionForm,
  type EmployeeOption,
  type ProductVariantOption,
  type StageOption,
  type WarehouseZoneOption,
} from "./production-action-forms";
import type { ProductionAction } from "./production-action-types";

const actionContent: Record<ProductionAction, { title: string; description: string; icon: typeof Plus }> = {
  "create-batch": { title: "Partiya yaratish", description: "Partiya yaratiladi va birinchi bosqich qoldig‘i backend orqali yangilanadi.", icon: Plus },
  "move-stage": { title: "Bosqichga o‘tkazish", description: "Mahsulotni bir bosqichdan boshqasiga backend orqali o‘tkazadi.", icon: ArrowRightLeft },
  "add-activity": { title: "Ishchi faolligi qo‘shish", description: "Ishchi bajargan dona miqdorini backend orqali qayd qiladi.", icon: ClipboardPlus },
  "register-defect": { title: "Brak qayd qilish", description: "Brakni backend orqali audit qilinadigan yozuv sifatida qayd qiladi.", icon: AlertTriangle },
  "receive-finished": { title: "Omborga qabul qilish", description: "Production Ombor bosqichidagi tayyor mahsulotni warehouse stock’ga qabul qiladi.", icon: PackageCheck },
};

interface ProductionActionDrawerProps {
  action: ProductionAction | null;
  onOpenChange: (open: boolean) => void;
  productVariantOptions: ProductVariantOption[];
  omborProductVariantOptions: ProductVariantOption[];
  stageOptions: StageOption[];
  employeeOptions: EmployeeOption[];
  warehouseZoneOptions: WarehouseZoneOption[];
  isCreateBatchPending: boolean;
  isMoveStagePending: boolean;
  isWorkerActivityPending: boolean;
  isDefectPending: boolean;
  isFinishedProductReceiptPending: boolean;
  createBatchError?: string | null;
  moveStageError?: string | null;
  workerActivityError?: string | null;
  defectError?: string | null;
  finishedProductReceiptError?: string | null;
  onCreateBatch: (values: CreateProductionBatchPayload) => Promise<void>;
  onMoveStage: (values: CreateStageMovementPayload) => Promise<void>;
  onCreateWorkerActivity: (values: CreateWorkerActivityPayload) => Promise<void>;
  onCreateDefect: (values: CreateDefectPayload) => Promise<void>;
  onCreateFinishedProductReceipt: (
    values: FinishedProductReceiptPayload,
  ) => Promise<void>;
  onSuccess: (message: string) => void;
}

export function ProductionActionDrawer({
  action,
  onOpenChange,
  productVariantOptions,
  omborProductVariantOptions,
  stageOptions,
  employeeOptions,
  warehouseZoneOptions,
  isCreateBatchPending,
  isMoveStagePending,
  isWorkerActivityPending,
  isDefectPending,
  isFinishedProductReceiptPending,
  createBatchError,
  moveStageError,
  workerActivityError,
  defectError,
  finishedProductReceiptError,
  onCreateBatch,
  onMoveStage,
  onCreateWorkerActivity,
  onCreateDefect,
  onCreateFinishedProductReceipt,
  onSuccess,
}: ProductionActionDrawerProps) {
  if (!action) return null;
  const definition = actionContent[action];
  const Icon = definition.icon;

  return (
    <Drawer
      open={Boolean(action)}
      onOpenChange={onOpenChange}
      title={definition.title}
      description={definition.description}
    >
      <div className="space-y-5">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon size={20} />
        </span>
        <ProductionActionForm
          key={action}
          action={action}
          productVariantOptions={productVariantOptions}
          omborProductVariantOptions={omborProductVariantOptions}
          stageOptions={stageOptions}
          employeeOptions={employeeOptions}
          warehouseZoneOptions={warehouseZoneOptions}
          isCreateBatchPending={isCreateBatchPending}
          isMoveStagePending={isMoveStagePending}
          isWorkerActivityPending={isWorkerActivityPending}
          isDefectPending={isDefectPending}
          isFinishedProductReceiptPending={isFinishedProductReceiptPending}
          createBatchError={createBatchError}
          moveStageError={moveStageError}
          workerActivityError={workerActivityError}
          defectError={defectError}
          finishedProductReceiptError={finishedProductReceiptError}
          onCreateBatch={onCreateBatch}
          onMoveStage={onMoveStage}
          onCreateWorkerActivity={onCreateWorkerActivity}
          onCreateDefect={onCreateDefect}
          onCreateFinishedProductReceipt={onCreateFinishedProductReceipt}
          onSuccess={onSuccess}
        />
      </div>
    </Drawer>
  );
}
