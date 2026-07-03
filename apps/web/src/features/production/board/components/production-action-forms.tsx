"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CreateDefectPayload,
  CreateProductionBatchPayload,
  CreateStageMovementPayload,
  CreateWorkerActivityPayload,
} from "@/lib/api/production";
import type { FinishedProductReceiptPayload } from "@/lib/api/warehouse";
import type { ProductionAction } from "./production-action-types";

const createBatchSchema = z.object({
  productVariantId: z.string().min(1, "Mahsulot varianti tanlanishi kerak."),
  quantity: z.coerce
    .number({ invalid_type_error: "Miqdor son bo‘lishi kerak." })
    .int("Miqdor butun son bo‘lishi kerak.")
    .positive("Miqdor 0 dan katta bo‘lishi kerak."),
  note: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

const moveStageSchema = z
  .object({
    sourceStageId: z.string().min(1, "Boshlang‘ich bosqich tanlanishi kerak."),
    destinationStageId: z.string().min(1, "Yakuniy bosqich tanlanishi kerak."),
    productVariantId: z.string().min(1, "Mahsulot varianti tanlanishi kerak."),
    quantity: z.coerce
      .number({ invalid_type_error: "Miqdor son bo‘lishi kerak." })
      .int("Miqdor butun son bo‘lishi kerak.")
      .positive("Miqdor 0 dan katta bo‘lishi kerak."),
    note: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
  })
  .refine((values) => values.sourceStageId !== values.destinationStageId, {
    path: ["destinationStageId"],
    message: "Bosqichlar bir xil bo‘lishi mumkin emas.",
  });

const workerActivitySchema = z.object({
  employeeId: z.string().min(1, "Ishchi tanlanishi kerak."),
  stageId: z.string().min(1, "Bosqich tanlanishi kerak."),
  productVariantId: z.string().min(1, "Mahsulot varianti tanlanishi kerak."),
  quantity: z.coerce
    .number({ invalid_type_error: "Miqdor son bo‘lishi kerak." })
    .int("Miqdor butun son bo‘lishi kerak.")
    .positive("Miqdor 0 dan katta bo‘lishi kerak."),
  note: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

const defectSchema = z.object({
  employeeId: z.string().optional(),
  stageId: z.string().optional(),
  productVariantId: z.string().optional(),
  quantity: z.coerce
    .number({ invalid_type_error: "Miqdor son bo‘lishi kerak." })
    .int("Miqdor butun son bo‘lishi kerak.")
    .positive("Miqdor 0 dan katta bo‘lishi kerak."),
  reason: z
    .string()
    .trim()
    .min(3, "Sabab kamida 3 ta belgidan iborat bo‘lishi kerak."),
});

const finishedProductReceiptSchema = z.object({
  productVariantId: z.string().min(1, "Mahsulot varianti tanlanishi kerak."),
  quantity: z.coerce
    .number({ invalid_type_error: "Miqdor son bo‘lishi kerak." })
    .int("Miqdor butun son bo‘lishi kerak.")
    .positive("Miqdor 0 dan katta bo‘lishi kerak."),
  warehouseZoneId: z.string().optional(),
  note: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type CreateBatchValues = z.infer<typeof createBatchSchema>;
export type MoveStageValues = z.infer<typeof moveStageSchema>;
export type WorkerActivityValues = z.infer<typeof workerActivitySchema>;
export type DefectValues = z.infer<typeof defectSchema>;
export type FinishedProductReceiptValues = z.infer<
  typeof finishedProductReceiptSchema
>;

export interface ProductVariantOption {
  id: string;
  label: string;
}

export interface StageOption {
  id: string;
  label: string;
}

export interface EmployeeOption {
  id: string;
  label: string;
}

export interface WarehouseZoneOption {
  id: string;
  label: string;
}

interface ProductionActionFormProps {
  action: ProductionAction;
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

function CreateBatchForm({
  productVariantOptions,
  isCreateBatchPending,
  createBatchError,
  onCreateBatch,
  onSuccess,
}: Omit<ProductionActionFormProps, "action">) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateBatchValues>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: {
      productVariantId: "",
      quantity: 500,
      note: "",
    },
  });

  const submit = async (values: CreateBatchValues) => {
    try {
      await onCreateBatch(values);
      reset();
      onSuccess("Partiya yaratildi va birinchi bosqich qoldig‘i yangilandi.");
    } catch {
      // The mutation error is rendered from parent state so the drawer remains open.
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <FormField
        label="Mahsulot varianti"
        htmlFor="productVariantId"
        error={errors.productVariantId?.message}
        required
      >
        <Select
          id="productVariantId"
          defaultValue=""
          disabled={isCreateBatchPending || productVariantOptions.length === 0}
          aria-invalid={Boolean(errors.productVariantId)}
          {...register("productVariantId")}
        >
          <option value="" disabled>
            Tanlang
          </option>
          {productVariantOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      {productVariantOptions.length === 0 ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Product catalog’da active variant yo‘q. Avval Sozlamalar → Mahsulotlar
          sahifasida product va variant yarating.
        </p>
      ) : null}

      <FormField
        label="Miqdor"
        htmlFor="batchQuantity"
        error={errors.quantity?.message}
        required
      >
        <Input
          id="batchQuantity"
          type="number"
          min="1"
          step="1"
          placeholder="Masalan: 500"
          disabled={isCreateBatchPending}
          aria-invalid={Boolean(errors.quantity)}
          {...register("quantity")}
        />
      </FormField>

      <FormField label="Izoh" htmlFor="batchNote" error={errors.note?.message}>
        <Textarea
          id="batchNote"
          placeholder="Ixtiyoriy izoh"
          disabled={isCreateBatchPending}
          {...register("note")}
        />
      </FormField>

      {createBatchError ? (
        <p role="alert" className="text-sm text-rose-500">
          {createBatchError}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={isCreateBatchPending || productVariantOptions.length === 0}
      >
        {isCreateBatchPending ? "Yuborilmoqda..." : "Partiya yaratish"}
      </Button>
    </form>
  );
}

function MoveStageForm({
  productVariantOptions,
  stageOptions,
  isMoveStagePending,
  moveStageError,
  onMoveStage,
  onSuccess,
}: Omit<ProductionActionFormProps, "action" | "isCreateBatchPending" | "createBatchError" | "onCreateBatch">) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MoveStageValues>({
    resolver: zodResolver(moveStageSchema),
    defaultValues: {
      sourceStageId: "",
      destinationStageId: "",
      productVariantId: "",
      quantity: 500,
      note: "",
    },
  });

  const submit = async (values: MoveStageValues) => {
    try {
      await onMoveStage(values);
      reset();
      onSuccess("Mahsulot keyingi bosqichga o‘tkazildi.");
    } catch {
      // The mutation error is rendered from parent state so the drawer remains open.
    }
  };

  const hasRequiredOptions =
    productVariantOptions.length > 0 && stageOptions.length >= 2;

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <FormField
        label="Mahsulot varianti"
        htmlFor="moveProductVariantId"
        error={errors.productVariantId?.message}
        required
      >
        <Select
          id="moveProductVariantId"
          defaultValue=""
          disabled={isMoveStagePending || productVariantOptions.length === 0}
          aria-invalid={Boolean(errors.productVariantId)}
          {...register("productVariantId")}
        >
          <option value="" disabled>
            Tanlang
          </option>
          {productVariantOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Qayerdan"
          htmlFor="sourceStageId"
          error={errors.sourceStageId?.message}
          required
        >
          <Select
            id="sourceStageId"
            defaultValue=""
            disabled={isMoveStagePending || stageOptions.length === 0}
            aria-invalid={Boolean(errors.sourceStageId)}
            {...register("sourceStageId")}
          >
            <option value="" disabled>
              Tanlang
            </option>
            {stageOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Qayerga"
          htmlFor="destinationStageId"
          error={errors.destinationStageId?.message}
          required
        >
          <Select
            id="destinationStageId"
            defaultValue=""
            disabled={isMoveStagePending || stageOptions.length === 0}
            aria-invalid={Boolean(errors.destinationStageId)}
            {...register("destinationStageId")}
          >
            <option value="" disabled>
              Tanlang
            </option>
            {stageOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {!hasRequiredOptions ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Bosqichga o‘tkazish uchun kamida bitta product variant va ikkita active
          ishlab chiqarish bosqichi kerak.
        </p>
      ) : null}

      <FormField
        label="Miqdor"
        htmlFor="moveQuantity"
        error={errors.quantity?.message}
        required
      >
        <Input
          id="moveQuantity"
          type="number"
          min="1"
          step="1"
          placeholder="Masalan: 500"
          disabled={isMoveStagePending}
          aria-invalid={Boolean(errors.quantity)}
          {...register("quantity")}
        />
      </FormField>

      <FormField label="Izoh" htmlFor="moveNote" error={errors.note?.message}>
        <Textarea
          id="moveNote"
          placeholder="Ixtiyoriy izoh"
          disabled={isMoveStagePending}
          {...register("note")}
        />
      </FormField>

      {moveStageError ? (
        <p role="alert" className="text-sm text-rose-500">
          {moveStageError}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={isMoveStagePending || !hasRequiredOptions}
      >
        {isMoveStagePending ? "Yuborilmoqda..." : "Bosqichga o‘tkazish"}
      </Button>
    </form>
  );
}

function WorkerActivityForm({
  productVariantOptions,
  stageOptions,
  employeeOptions,
  isWorkerActivityPending,
  workerActivityError,
  onCreateWorkerActivity,
  onSuccess,
}: Omit<
  ProductionActionFormProps,
  | "action"
  | "isCreateBatchPending"
  | "isMoveStagePending"
  | "createBatchError"
  | "moveStageError"
  | "onCreateBatch"
  | "onMoveStage"
>) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WorkerActivityValues>({
    resolver: zodResolver(workerActivitySchema),
    defaultValues: {
      employeeId: "",
      stageId: "",
      productVariantId: "",
      quantity: 1,
      note: "",
    },
  });

  const submit = async (values: WorkerActivityValues) => {
    try {
      await onCreateWorkerActivity(values);
      reset();
      onSuccess("Ishchi faolligi qayd qilindi.");
    } catch {
      // The mutation error is rendered from parent state so the drawer remains open.
    }
  };

  const hasRequiredOptions =
    employeeOptions.length > 0 &&
    stageOptions.length > 0 &&
    productVariantOptions.length > 0;

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <FormField
        label="Ishchi"
        htmlFor="activityEmployeeId"
        error={errors.employeeId?.message}
        required
      >
        <Select
          id="activityEmployeeId"
          defaultValue=""
          disabled={isWorkerActivityPending || employeeOptions.length === 0}
          aria-invalid={Boolean(errors.employeeId)}
          {...register("employeeId")}
        >
          <option value="" disabled>
            Tanlang
          </option>
          {employeeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Bosqich"
        htmlFor="activityStageId"
        error={errors.stageId?.message}
        required
      >
        <Select
          id="activityStageId"
          defaultValue=""
          disabled={isWorkerActivityPending || stageOptions.length === 0}
          aria-invalid={Boolean(errors.stageId)}
          {...register("stageId")}
        >
          <option value="" disabled>
            Tanlang
          </option>
          {stageOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Mahsulot varianti"
        htmlFor="activityProductVariantId"
        error={errors.productVariantId?.message}
        required
      >
        <Select
          id="activityProductVariantId"
          defaultValue=""
          disabled={isWorkerActivityPending || productVariantOptions.length === 0}
          aria-invalid={Boolean(errors.productVariantId)}
          {...register("productVariantId")}
        >
          <option value="" disabled>
            Tanlang
          </option>
          {productVariantOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      {!hasRequiredOptions ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Ishchi faolligini kiritish uchun active ishchi, bosqich va product
          variant kerak. Tizim’da tegishli ishbay stavka ham sozlangan bo‘lishi
          shart.
        </p>
      ) : null}

      <FormField
        label="Miqdor"
        htmlFor="activityQuantity"
        error={errors.quantity?.message}
        required
      >
        <Input
          id="activityQuantity"
          type="number"
          min="1"
          step="1"
          placeholder="Masalan: 120"
          disabled={isWorkerActivityPending}
          aria-invalid={Boolean(errors.quantity)}
          {...register("quantity")}
        />
      </FormField>

      <FormField
        label="Izoh"
        htmlFor="activityNote"
        error={errors.note?.message}
      >
        <Textarea
          id="activityNote"
          placeholder="Ixtiyoriy izoh"
          disabled={isWorkerActivityPending}
          {...register("note")}
        />
      </FormField>

      {workerActivityError ? (
        <p role="alert" className="text-sm text-rose-500">
          {workerActivityError}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={isWorkerActivityPending || !hasRequiredOptions}
      >
        {isWorkerActivityPending ? "Yuborilmoqda..." : "Faollik qo‘shish"}
      </Button>
    </form>
  );
}

function DefectForm({
  productVariantOptions,
  stageOptions,
  employeeOptions,
  isDefectPending,
  defectError,
  onCreateDefect,
  onSuccess,
}: Omit<
  ProductionActionFormProps,
  | "action"
  | "isCreateBatchPending"
  | "isMoveStagePending"
  | "isWorkerActivityPending"
  | "createBatchError"
  | "moveStageError"
  | "workerActivityError"
  | "onCreateBatch"
  | "onMoveStage"
  | "onCreateWorkerActivity"
>) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DefectValues>({
    resolver: zodResolver(defectSchema),
    defaultValues: {
      employeeId: "",
      stageId: "",
      productVariantId: "",
      quantity: 1,
      reason: "",
    },
  });

  const submit = async (values: DefectValues) => {
    try {
      await onCreateDefect({
        employeeId: values.employeeId || null,
        stageId: values.stageId || null,
        productVariantId: values.productVariantId || null,
        quantity: values.quantity,
        reason: values.reason,
      });
      reset();
      onSuccess("Brak qayd qilindi.");
    } catch {
      // The mutation error is rendered from parent state so the drawer remains open.
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <FormField label="Ishchi" htmlFor="defectEmployeeId">
        <Select
          id="defectEmployeeId"
          defaultValue=""
          disabled={isDefectPending}
          {...register("employeeId")}
        >
          <option value="">Tanlanmagan</option>
          {employeeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Bosqich" htmlFor="defectStageId">
        <Select
          id="defectStageId"
          defaultValue=""
          disabled={isDefectPending}
          {...register("stageId")}
        >
          <option value="">Tanlanmagan</option>
          {stageOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Mahsulot varianti" htmlFor="defectProductVariantId">
        <Select
          id="defectProductVariantId"
          defaultValue=""
          disabled={isDefectPending}
          {...register("productVariantId")}
        >
          <option value="">Tanlanmagan</option>
          {productVariantOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Miqdor"
        htmlFor="defectQuantity"
        error={errors.quantity?.message}
        required
      >
        <Input
          id="defectQuantity"
          type="number"
          min="1"
          step="1"
          placeholder="Masalan: 3"
          disabled={isDefectPending}
          aria-invalid={Boolean(errors.quantity)}
          {...register("quantity")}
        />
      </FormField>

      <FormField
        label="Sabab"
        htmlFor="defectReason"
        error={errors.reason?.message}
        required
      >
        <Textarea
          id="defectReason"
          placeholder="Masalan: ip uzilishi, sifatsiz tikuv..."
          disabled={isDefectPending}
          aria-invalid={Boolean(errors.reason)}
          {...register("reason")}
        />
      </FormField>

      <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
        V1 da brak faqat qayd qilinadi: payroll, jarima va stage inventory
        avtomatik o‘zgarmaydi.
      </p>

      {defectError ? (
        <p role="alert" className="text-sm text-rose-500">
          {defectError}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isDefectPending}>
        {isDefectPending ? "Yuborilmoqda..." : "Brak qayd qilish"}
      </Button>
    </form>
  );
}

function FinishedProductReceiptForm({
  omborProductVariantOptions,
  warehouseZoneOptions,
  isFinishedProductReceiptPending,
  finishedProductReceiptError,
  onCreateFinishedProductReceipt,
  onSuccess,
}: Omit<
  ProductionActionFormProps,
  | "action"
  | "productVariantOptions"
  | "stageOptions"
  | "employeeOptions"
  | "isCreateBatchPending"
  | "isMoveStagePending"
  | "isWorkerActivityPending"
  | "isDefectPending"
  | "createBatchError"
  | "moveStageError"
  | "workerActivityError"
  | "defectError"
  | "onCreateBatch"
  | "onMoveStage"
  | "onCreateWorkerActivity"
  | "onCreateDefect"
>) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FinishedProductReceiptValues>({
    resolver: zodResolver(finishedProductReceiptSchema),
    defaultValues: {
      productVariantId: "",
      quantity: 1,
      warehouseZoneId: "",
      note: "",
    },
  });

  const submit = async (values: FinishedProductReceiptValues) => {
    try {
      await onCreateFinishedProductReceipt({
        productVariantId: values.productVariantId,
        quantity: values.quantity,
        warehouseZoneId: values.warehouseZoneId || null,
        note: values.note,
      });
      reset();
      onSuccess("Tayyor mahsulot omborga qabul qilindi.");
    } catch {
      // The mutation error is rendered from parent state so the drawer remains open.
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <FormField
        label="Ombor bosqichidagi mahsulot"
        htmlFor="receiptProductVariantId"
        error={errors.productVariantId?.message}
        required
      >
        <Select
          id="receiptProductVariantId"
          defaultValue=""
          disabled={
            isFinishedProductReceiptPending ||
            omborProductVariantOptions.length === 0
          }
          aria-invalid={Boolean(errors.productVariantId)}
          {...register("productVariantId")}
        >
          <option value="" disabled>
            Tanlang
          </option>
          {omborProductVariantOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      {omborProductVariantOptions.length === 0 ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Production Ombor bosqichida qabul qilinadigan mahsulot yo‘q.
        </p>
      ) : null}

      <FormField
        label="Miqdor"
        htmlFor="receiptQuantity"
        error={errors.quantity?.message}
        required
      >
        <Input
          id="receiptQuantity"
          type="number"
          min="1"
          step="1"
          placeholder="Masalan: 100"
          disabled={isFinishedProductReceiptPending}
          aria-invalid={Boolean(errors.quantity)}
          {...register("quantity")}
        />
      </FormField>

      <FormField label="Zona" htmlFor="receiptWarehouseZoneId">
        <Select
          id="receiptWarehouseZoneId"
          defaultValue=""
          disabled={isFinishedProductReceiptPending}
          {...register("warehouseZoneId")}
        >
          <option value="">Finished Products avtomatik</option>
          {warehouseZoneOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Izoh" htmlFor="receiptNote" error={errors.note?.message}>
        <Textarea
          id="receiptNote"
          placeholder="Ixtiyoriy izoh"
          disabled={isFinishedProductReceiptPending}
          {...register("note")}
        />
      </FormField>

      {finishedProductReceiptError ? (
        <p role="alert" className="text-sm text-rose-500">
          {finishedProductReceiptError}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={
          isFinishedProductReceiptPending ||
          omborProductVariantOptions.length === 0
        }
      >
        {isFinishedProductReceiptPending ? "Yuborilmoqda..." : "Omborga qabul qilish"}
      </Button>
    </form>
  );
}

export function ProductionActionForm(props: ProductionActionFormProps) {
  if (props.action === "create-batch") {
    return <CreateBatchForm {...props} />;
  }

  if (props.action === "move-stage") {
    return <MoveStageForm {...props} />;
  }

  if (props.action === "add-activity") {
    return <WorkerActivityForm {...props} />;
  }

  if (props.action === "receive-finished") {
    return <FinishedProductReceiptForm {...props} />;
  }

  return <DefectForm {...props} />;
}
