"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
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
  StageInventory,
} from "@/lib/api/production";
import type { FinishedProductReceiptPayload } from "@/lib/api/warehouse";
import type { ProductionAction } from "./production-action-types";
import {
  DEFAULT_STAGE_MOVEMENT_BATCH_SIZE,
  getInitialStageMovementQuantity,
} from "./stage-movement-quantity";

const EMPTY_EMPLOYEE_IDS: string[] = [];

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
    employeeIds: z
      .array(z.string())
      .min(1, "Kamida bitta ishchi tanlanishi shart."),
    /** employeeId → dona; yig‘indi quantity ga teng bo‘lishi kerak. */
    workerQuantities: z.record(
      z.string(),
      z.coerce
        .number({ invalid_type_error: "Miqdor son bo‘lishi kerak." })
        .int("Butun son bo‘lishi kerak.")
        .positive("Kamida 1 dona."),
    ),
    note: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
  })
  .refine((values) => values.sourceStageId !== values.destinationStageId, {
    path: ["destinationStageId"],
    message: "Bosqichlar bir xil bo‘lishi mumkin emas.",
  })
  .refine((values) => values.quantity >= values.employeeIds.length, {
    path: ["quantity"],
    message:
      "Miqdor tanlangan ishchilar sonidan kam bo‘lmasin (har biriga kamida 1 dona).",
  })
  .refine(
    (values) => {
      if (values.employeeIds.length === 0) return true;
      const sum = values.employeeIds.reduce(
        (acc, id) => acc + (Number(values.workerQuantities[id]) || 0),
        0,
      );
      return sum === values.quantity;
    },
    {
      path: ["workerQuantities"],
      message:
        "Ishchilar miqdorlari yig‘indisi umumiy miqdorga teng bo‘lishi kerak.",
    },
  );

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
  jobRole: "STAGE_WORKER" | "MECHANIC" | "MACHINE_OPERATOR";
  /** Biriktirilgan bosqich ID lari (filter uchun). */
  stageIds?: string[];
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
  stageInventory: StageInventory[];
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
      onSuccess(
        "Ishlab chiqarish qabul qilindi va birinchi bosqich qoldig‘i yangilandi.",
      );
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
          Faol mahsulot turi yo‘q. Avval Sozlamalar → Mahsulotlar
          sahifasida mahsulot va uning turini yarating.
        </p>
      ) : null}

      <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
        Bu eski partiyalar uchun qo‘lda qabul qilish. Mexanik va operatorning
        ishbay haqini hisoblash uchun Stanoklar bo‘limida tayyor mahsulotni qabul qiling.
      </p>

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
        disabled={
          isCreateBatchPending ||
          productVariantOptions.length === 0
        }
      >
        {isCreateBatchPending
          ? "Yuborilmoqda..."
          : "Manual qabul (legacy)"}
      </Button>
    </form>
  );
}

function equalSplitQuantities(
  total: number,
  employeeIds: string[],
): Record<string, number> {
  if (employeeIds.length === 0 || total < 1) return {};
  const base = Math.floor(total / employeeIds.length);
  let remainder = total - base * employeeIds.length;
  const next: Record<string, number> = {};
  for (const id of employeeIds) {
    const qty = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    next[id] = Math.max(1, qty);
  }
  return next;
}

function MoveStageForm({
  productVariantOptions,
  stageOptions,
  employeeOptions,
  stageInventory,
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
    watch,
    setValue,
    setError,
    clearErrors,
  } = useForm<MoveStageValues>({
    resolver: zodResolver(moveStageSchema),
    defaultValues: {
      sourceStageId: "",
      destinationStageId: "",
      productVariantId: "",
      quantity: 0,
      employeeIds: [],
      workerQuantities: {},
      note: "",
    },
  });

  const sourceStageId = watch("sourceStageId");
  const productVariantId = watch("productVariantId");
  const quantity = Number(watch("quantity")) || 0;
  const selectedEmployeeIds = watch("employeeIds") ?? EMPTY_EMPLOYEE_IDS;
  const workerQuantities = watch("workerQuantities") ?? {};
  const initializedSelectionRef = useRef("");
  const workerSharesAreAutomaticRef = useRef(true);
  const moveSubmissionRef = useRef(false);

  // Faqat manba bosqichga biriktirilgan ishchilar (backend ham shu qoidani talab qiladi).
  const stageEmployees = employeeOptions.filter(
    (employee) =>
      sourceStageId &&
      employee.stageIds?.length &&
      employee.stageIds.includes(sourceStageId),
  );
  const selectedInventory = stageInventory.find(
    (item) =>
      item.stage.id === sourceStageId &&
      item.productVariant.id === productVariantId,
  );
  const availableQuantity = selectedInventory?.quantity ?? 0;
  const hasInventorySelection = Boolean(sourceStageId && productVariantId);
  const exceedsAvailableQuantity =
    hasInventorySelection && quantity > availableQuantity;

  useEffect(() => {
    if (!hasInventorySelection) return;

    const selectionKey = `${sourceStageId}:${productVariantId}`;
    if (initializedSelectionRef.current === selectionKey) return;

    initializedSelectionRef.current = selectionKey;
    const initialQuantity = getInitialStageMovementQuantity(
      DEFAULT_STAGE_MOVEMENT_BATCH_SIZE,
      availableQuantity,
    );
    setValue("quantity", initialQuantity, {
      shouldDirty: false,
      shouldValidate: true,
    });
    if (workerSharesAreAutomaticRef.current) {
      setValue(
        "workerQuantities",
        equalSplitQuantities(initialQuantity, selectedEmployeeIds),
        { shouldDirty: false, shouldValidate: true },
      );
    }
  }, [
    availableQuantity,
    hasInventorySelection,
    productVariantId,
    selectedEmployeeIds,
    setValue,
    sourceStageId,
  ]);

  const submit = async (values: MoveStageValues) => {
    if (moveSubmissionRef.current) return;
    if (values.quantity > availableQuantity) {
      setError("quantity", {
        type: "manual",
        message: `Bu bosqichda faqat ${availableQuantity} dona mavjud.`,
      });
      return;
    }

    moveSubmissionRef.current = true;
    try {
      const workerShares = values.employeeIds.map((employeeId) => ({
        employeeId,
        quantity: Number(values.workerQuantities[employeeId]) || 0,
      }));
      await onMoveStage({
        sourceStageId: values.sourceStageId,
        destinationStageId: values.destinationStageId,
        productVariantId: values.productVariantId,
        quantity: values.quantity,
        employeeIds: values.employeeIds,
        workerShares,
        note: values.note,
      });
      reset();
      onSuccess(
        "Smena o‘tkazildi. Tanlangan ishchilarga faollik avtomatik yozildi.",
      );
    } catch {
      // The mutation error is rendered from parent state so the drawer remains open.
    } finally {
      moveSubmissionRef.current = false;
    }
  };

  const hasRequiredOptions =
    productVariantOptions.length > 0 &&
    stageOptions.length >= 2 &&
    (sourceStageId ? stageEmployees.length > 0 : employeeOptions.length > 0);

  function applyEqualSplit(employeeIds: string[], total: number) {
    workerSharesAreAutomaticRef.current = true;
    setValue("workerQuantities", equalSplitQuantities(total, employeeIds), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  function toggleEmployee(employeeId: string) {
    const next = selectedEmployeeIds.includes(employeeId)
      ? selectedEmployeeIds.filter((id) => id !== employeeId)
      : [...selectedEmployeeIds, employeeId];
    setValue("employeeIds", next, { shouldValidate: true, shouldDirty: true });
    if (workerSharesAreAutomaticRef.current) {
      applyEqualSplit(next, quantity);
    } else {
      const nextQuantities = Object.fromEntries(
        next
          .filter((id) => workerQuantities[id] !== undefined)
          .map((id) => [id, workerQuantities[id]]),
      );
      setValue("workerQuantities", nextQuantities, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }

  function onSourceStageChange(nextStageId: string) {
    setValue("sourceStageId", nextStageId, {
      shouldValidate: true,
      shouldDirty: true,
    });
    // Bosqich o‘zgarsa — tanlovni tozalash (boshqa bosqich ishchilari yaroqsiz).
    setValue("employeeIds", [], { shouldValidate: true });
    setValue("workerQuantities", {}, { shouldValidate: true });
    initializedSelectionRef.current = "";
    workerSharesAreAutomaticRef.current = true;
    clearErrors("quantity");
  }

  function onQuantityChange(raw: string) {
    const nextQty = Number(raw);
    setValue("quantity", Number.isFinite(nextQty) ? nextQty : (0 as number), {
      shouldValidate: true,
      shouldDirty: true,
    });
    clearErrors("quantity");
    if (
      workerSharesAreAutomaticRef.current &&
      Number.isFinite(nextQty) &&
      nextQty >= 1 &&
      selectedEmployeeIds.length > 0
    ) {
      applyEqualSplit(selectedEmployeeIds, Math.floor(nextQty));
    }
  }

  const shareSum = selectedEmployeeIds.reduce(
    (acc, id) => acc + (Number(workerQuantities[id]) || 0),
    0,
  );

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <FormField
        label="Mahsulot"
        htmlFor="moveProductVariantId"
        error={errors.productVariantId?.message}
        required
      >
        <Select
          id="moveProductVariantId"
          defaultValue=""
          disabled={isMoveStagePending || productVariantOptions.length === 0}
          aria-invalid={Boolean(errors.productVariantId)}
          {...register("productVariantId", {
            onChange: () => clearErrors("quantity"),
          })}
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
          label="Qayerdan (ishlangan bosqich)"
          htmlFor="sourceStageId"
          error={errors.sourceStageId?.message}
          required
        >
          <Select
            id="sourceStageId"
            value={sourceStageId}
            disabled={isMoveStagePending || stageOptions.length === 0}
            aria-invalid={Boolean(errors.sourceStageId)}
            onChange={(event) => onSourceStageChange(event.target.value)}
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

      {hasInventorySelection ? (
        <div
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            availableQuantity > 0
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/25 bg-amber-500/10 text-amber-300"
          }`}
        >
          Tanlangan mahsulotdan bu bosqichda{" "}
          <strong>{availableQuantity} dona</strong> mavjud.
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Mahsulot va «Qayerdan» bosqichini tanlang — mavjud qoldiq shu yerda
          ko‘rinadi.
        </p>
      )}

      {!hasRequiredOptions ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Smena uchun: mahsulot, kamida 2 ta bosqich va kamida 1 ta faol ishchi kerak.
        </p>
      ) : null}

      <FormField
        label="Miqdor (dona)"
        htmlFor="moveQuantity"
        error={errors.quantity?.message}
        required
      >
        <Input
          id="moveQuantity"
          type="number"
          min="1"
          max={hasInventorySelection ? availableQuantity : undefined}
          step="1"
          placeholder="Masalan: 500"
          disabled={isMoveStagePending}
          aria-invalid={Boolean(errors.quantity)}
          value={Number.isFinite(quantity) && quantity > 0 ? quantity : ""}
          onChange={(event) => onQuantityChange(event.target.value)}
        />
      </FormField>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Kim ishladi?{" "}
          <span className="text-muted-foreground">(shu bosqich ishchilari)</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Faqat «Qayerdan» bosqichiga biriktirilgan ishchilar. Har biriga dona
          yozing (yig‘indi = umumiy miqdor). «Teng bo‘lish» tugmasi qulay
          boshlang‘ich qiymat beradi.
        </p>
        {!sourceStageId ? (
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Avval «Qayerdan» bosqichini tanlang — ishchilar shu bosqich bo‘yicha
            chiqadi.
          </p>
        ) : null}
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-3">
          {!sourceStageId ? (
            <p className="text-sm text-muted-foreground">Bosqich tanlanmagan.</p>
          ) : stageEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bu bosqichga biriktirilgan faol ishchi yo‘q. Xodimlar bo‘limida
              bosqich biriktiring.
            </p>
          ) : (
            stageEmployees.map((employee) => {
              const checked = selectedEmployeeIds.includes(employee.id);
              return (
                <div
                  key={employee.id}
                  className="flex flex-wrap items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      disabled={isMoveStagePending}
                      onChange={() => toggleEmployee(employee.id)}
                    />
                    <span className="text-sm">{employee.label}</span>
                  </label>
                  {checked ? (
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      className="h-8 w-24"
                      disabled={isMoveStagePending}
                      value={workerQuantities[employee.id] ?? ""}
                      aria-label={`${employee.label} miqdori`}
                      onChange={(event) => {
                        const next = {
                          ...workerQuantities,
                          [employee.id]: Number(event.target.value),
                        };
                        workerSharesAreAutomaticRef.current = false;
                        setValue("workerQuantities", next, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }}
                    />
                  ) : null}
                </div>
              );
            })
          )}
        </div>
        {selectedEmployeeIds.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Yig‘indi:{" "}
              <span
                className={
                  shareSum === quantity ? "text-emerald-400" : "text-amber-300"
                }
              >
                {shareSum}
              </span>{" "}
              / {quantity || "—"} dona
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-8 px-3 text-xs"
              disabled={isMoveStagePending}
              onClick={() =>
                applyEqualSplit(
                  selectedEmployeeIds,
                  quantity > 0 ? quantity : 1,
                )
              }
            >
              Teng bo‘lish
            </Button>
          </div>
        ) : null}
        {errors.employeeIds?.message ? (
          <p className="text-sm text-rose-400">{errors.employeeIds.message}</p>
        ) : null}
        {errors.workerQuantities?.message ? (
          <p className="text-sm text-rose-400">
            {String(errors.workerQuantities.message)}
          </p>
        ) : null}
      </div>

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
        disabled={
          isMoveStagePending ||
          !hasRequiredOptions ||
          !hasInventorySelection ||
          availableQuantity < 1 ||
          exceedsAvailableQuantity
        }
      >
        {isMoveStagePending ? "Yuborilmoqda..." : "Smenani saqlash"}
      </Button>
    </form>
  );
}

function WorkerActivityForm({
  productVariantOptions,
  stageOptions,
  employeeOptions,
  stageInventory,
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
    watch,
    setValue,
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

  const stageId = watch("stageId");
  const employeeId = watch("employeeId");
  const productVariantId = watch("productVariantId");
  const activitySubmissionRef = useRef(false);
  const stageEmployees = employeeOptions.filter(
    (employee) => stageId && employee.stageIds?.includes(stageId),
  );
  const selectedInventory = stageInventory.find(
    (item) =>
      item.stage.id === stageId && item.productVariant.id === productVariantId,
  );
  const hasInventorySelection = Boolean(stageId && productVariantId);
  const availableQuantity = selectedInventory?.quantity ?? 0;

  const submit = async (values: WorkerActivityValues) => {
    if (activitySubmissionRef.current) return;
    activitySubmissionRef.current = true;
    try {
      await onCreateWorkerActivity(values);
      reset();
      onSuccess("Ishchi faolligi qayd qilindi.");
    } catch {
      // The mutation error is rendered from parent state so the drawer remains open.
    } finally {
      activitySubmissionRef.current = false;
    }
  };

  const hasRequiredOptions =
    (stageId ? stageEmployees.length > 0 : employeeOptions.length > 0) &&
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
          value={employeeId}
          disabled={
            isWorkerActivityPending || !stageId || stageEmployees.length === 0
          }
          aria-invalid={Boolean(errors.employeeId)}
          {...register("employeeId")}
        >
          <option value="" disabled>
            {stageId ? "Tanlang" : "Avval bosqichni tanlang"}
          </option>
          {stageEmployees.map((option) => (
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
          value={stageId}
          disabled={isWorkerActivityPending || stageOptions.length === 0}
          aria-invalid={Boolean(errors.stageId)}
          onChange={(event) => {
            setValue("stageId", event.target.value, {
              shouldValidate: true,
              shouldDirty: true,
            });
            setValue("employeeId", "", { shouldValidate: true });
          }}
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

      {stageId && stageEmployees.length === 0 ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Bu bosqichga biriktirilgan faol ishchi yo‘q. Avval Xodimlar bo‘limida
          bosqich biriktiring.
        </p>
      ) : null}

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

      {hasInventorySelection ? (
        <div
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            availableQuantity > 0
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/25 bg-amber-500/10 text-amber-300"
          }`}
        >
          Tanlangan mahsulotdan bu bosqichda{" "}
          <strong>{availableQuantity} dona</strong> mavjud.
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Bosqich va mahsulotni tanlang — mavjud qoldiq shu yerda ko‘rinadi.
        </p>
      )}

      {!hasRequiredOptions ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Ishchi faolligini kiritish uchun active ishchi, bosqich va product
          variant kerak. Tizim’da tegishli ishbay stavka ham sozlangan bo‘lishi
          shart.
        </p>
      ) : (
        <p className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
          Eslatma: «Bosqichga ko‘chirish» allaqachon ishchi faolligini yozadi
          (ish haqi uchun). Bu forma faqat qo‘shimcha yoki tuzatish kiritish
          uchun — bir xil ishni ikki marta yozmang.
        </p>
      )}

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
        Nuqson hozircha faqat qayd qilinadi. Ish haqi, jarima va bosqichdagi
        qoldiq avtomatik o‘zgarmaydi.
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
          <option value="">Tayyor mahsulot zonasi avtomatik</option>
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
