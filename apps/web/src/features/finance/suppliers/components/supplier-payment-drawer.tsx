"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Drawer, DrawerFooter } from "@/components/overlays/drawer";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CreateSupplierPaymentPayload,
  Supplier,
  SupplierPurchase,
} from "@/lib/api/supplier";
import { formatCurrency } from "@/lib/utils";

const allocationSchema = z.object({
  purchaseId: z.string().min(1, "Xarid tanlanishi shart."),
  amount: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => Number(value) > 0, "Taqsimot summasi musbat bo‘lishi kerak."),
});

const paymentFormSchema = z
  .object({
    supplierId: z.string().min(1, "Yetkazib beruvchi tanlanishi shart."),
    amount: z
      .string()
      .transform((value) => value.trim())
      .refine((value) => Number(value) > 0, "To‘lov summasi musbat bo‘lishi kerak."),
    method: z.enum(["CASH", "TRANSFER", "OTHER"], {
      message: "To‘lov usuli tanlanishi shart.",
    }),
    paymentDate: z.string().optional(),
    note: z.string().optional(),
    allocations: z.array(allocationSchema).min(1, "Kamida bitta taqsimot kerak."),
  })
  .refine(
    (values) => {
      const paymentAmount = Number(values.amount);
      const allocationTotal = values.allocations.reduce(
        (total, allocation) => total + Number(allocation.amount),
        0,
      );

      return Math.abs(paymentAmount - allocationTotal) < 0.000001;
    },
    {
      message: "Taqsimotlar jami to‘lov summasiga teng bo‘lishi kerak.",
      path: ["allocations"],
    },
  );

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const paymentStatusLabel: Record<string, string> = {
  UNPAID: "To‘lanmagan",
  PARTIALLY_PAID: "Qisman to‘langan",
  PAID: "To‘langan",
};

interface SupplierPaymentDrawerProps {
  open: boolean;
  suppliers: Supplier[];
  purchases: SupplierPurchase[];
  isSubmitting: boolean;
  isOptionsLoading: boolean;
  initialSupplierId?: string | null;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateSupplierPaymentPayload, idempotencyKey: string) => Promise<void>;
}

export function SupplierPaymentDrawer({
  open,
  suppliers,
  purchases,
  isSubmitting,
  isOptionsLoading,
  initialSupplierId,
  errorMessage,
  onOpenChange,
  onSubmit,
}: SupplierPaymentDrawerProps) {
  const [pendingPayload, setPendingPayload] = useState<CreateSupplierPaymentPayload | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const submittedPayloadRef = useRef<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      supplierId: "",
      amount: "",
      method: "CASH",
      paymentDate: new Date().toISOString().slice(0, 10),
      note: "",
      allocations: [{ purchaseId: "", amount: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "allocations",
  });
  const selectedSupplierId = watch("supplierId");
  const watchedAllocations = watch("allocations");
  const paymentAmount = Number(watch("amount"));

  useEffect(() => {
    if (open) {
      setPendingPayload(null);
      idempotencyKeyRef.current = crypto.randomUUID();
      submittedPayloadRef.current = null;
      reset({
        supplierId: initialSupplierId ?? "",
        amount: "",
        method: "CASH",
        paymentDate: new Date().toISOString().slice(0, 10),
        note: "",
        allocations: [{ purchaseId: "", amount: "" }],
      });
    }
  }, [initialSupplierId, open, reset]);

  const supplierPurchases = useMemo(
    () =>
      purchases.filter(
        (purchase) =>
          purchase.supplier.id === selectedSupplierId &&
          purchase.cancelledAt === null &&
          purchase.paymentStatus !== "PAID",
      ),
    [purchases, selectedSupplierId],
  );
  const allocationTotal = watchedAllocations.reduce(
    (total, allocation) => total + Number(allocation.amount || 0),
    0,
  );
  const formDisabled = isSubmitting || isOptionsLoading;
  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId);
  const reviewPurchases = pendingPayload?.allocations.map((allocation) => purchases.find((purchase) => purchase.id === allocation.purchaseId)?.purchaseNumber ?? "Noma’lum xarid").join(", ") ?? "";

  return (
    <>
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Yetkazib beruvchi to‘lovi"
      description="To‘lov summasi to‘liq xarid yozuvlariga taqsimlanadi."
      className="max-w-4xl"
    >
      <form className="space-y-5 flex flex-col h-full min-h-[min-content]"
        onSubmit={handleSubmit((values) => setPendingPayload(buildPayload(values)))}
      >
        {initialSupplierId && selectedSupplier ? <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2"><p className="text-xs text-muted-foreground">Tanlangan yetkazib beruvchi</p><p className="font-semibold">{selectedSupplier.name}</p></div> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            htmlFor="supplierPaymentSupplier"
            label="Yetkazib beruvchi"
            error={errors.supplierId?.message}
            required
          >
            <Select
              id="supplierPaymentSupplier"
              disabled={formDisabled || Boolean(initialSupplierId)}
              aria-invalid={Boolean(errors.supplierId)}
              {...register("supplierId")}
            >
              <option value="">Yetkazib beruvchi tanlang</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            htmlFor="supplierPaymentAmount"
            label="To‘lov summasi"
            error={errors.amount?.message}
            required
          >
            <Input
              id="supplierPaymentAmount"
              type="number"
              min={0}
              step="0.01"
              disabled={formDisabled}
              aria-invalid={Boolean(errors.amount)}
              {...register("amount")}
            />
          </FormField>

          <FormField
            htmlFor="supplierPaymentMethod"
            label="To‘lov usuli"
            error={errors.method?.message}
            required
          >
            <Select
              id="supplierPaymentMethod"
              disabled={formDisabled}
              aria-invalid={Boolean(errors.method)}
              {...register("method")}
            >
              <option value="CASH">Naqd</option>
              <option value="TRANSFER">O‘tkazma</option>
              <option value="OTHER">Boshqa</option>
            </Select>
          </FormField>

          <FormField htmlFor="supplierPaymentDate" label="To‘lov sanasi">
            <Input
              id="supplierPaymentDate"
              type="date"
              disabled={formDisabled}
              {...register("paymentDate")}
            />
          </FormField>
        </div>

        <section className="space-y-3 rounded-xl border bg-muted/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Taqsimotlar</p>
              <p className="text-xs text-muted-foreground">
                To‘lov summasi to‘liq xarid yozuvlariga bog‘lanishi shart.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={formDisabled || !selectedSupplierId}
              onClick={() => append({ purchaseId: "", amount: "" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Qator qo‘shish
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg border bg-card/60 p-3 md:grid-cols-[1fr_180px_auto]"
              >
                <FormField
                  htmlFor={`supplierPaymentPurchase-${field.id}`}
                  label="Xarid"
                  error={errors.allocations?.[index]?.purchaseId?.message}
                  required
                >
                  <Select
                    id={`supplierPaymentPurchase-${field.id}`}
                    disabled={formDisabled || !selectedSupplierId}
                    aria-invalid={Boolean(errors.allocations?.[index]?.purchaseId)}
                    {...register(`allocations.${index}.purchaseId`)}
                  >
                    <option value="">Xarid tanlang</option>
                    {supplierPurchases.map((purchase) => (
                      <option key={purchase.id} value={purchase.id}>
                        {purchase.purchaseNumber} · {formatCurrency(purchase.totalAmount)} ·{" "}
                        {paymentStatusLabel[purchase.paymentStatus] ?? purchase.paymentStatus}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  htmlFor={`supplierPaymentAllocation-${field.id}`}
                  label="Taqsimot summasi"
                  error={errors.allocations?.[index]?.amount?.message}
                  required
                >
                  <Input
                    id={`supplierPaymentAllocation-${field.id}`}
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={formDisabled}
                    aria-invalid={Boolean(errors.allocations?.[index]?.amount)}
                    {...register(`allocations.${index}.amount`)}
                  />
                </FormField>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={formDisabled || fields.length === 1}
                    onClick={() => remove(index)}
                    aria-label="Taqsimot qatorini o‘chirish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {typeof errors.allocations?.message === "string" ? (
            <p role="alert" className="text-xs text-rose-500">
              {errors.allocations.message}
            </p>
          ) : null}
        </section>

        <FormField htmlFor="supplierPaymentNote" label="Izoh">
          <Textarea
            id="supplierPaymentNote"
            placeholder="Ixtiyoriy izoh"
            disabled={formDisabled}
            {...register("note")}
          />
        </FormField>

        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
          To‘lov: {Number.isFinite(paymentAmount) ? paymentAmount.toLocaleString("uz-UZ") : "0"} so‘m · Taqsimot: {allocationTotal.toLocaleString("uz-UZ")} so‘m. Tizim yakuniy tekshiruvni qayta bajaradi.
        </div>

        {selectedSupplierId && supplierPurchases.length === 0 ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Bu yetkazib beruvchi uchun taqsimlanadigan xarid topilmadi.
          </p>
        ) : null}

        {errorMessage ? (
          <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {errorMessage}
          </p>
        ) : null}

        <DrawerFooter><Button
          type="submit"
          className="w-full"
          disabled={formDisabled || suppliers.length === 0 || purchases.length === 0}
        >
          {isSubmitting ? "To‘lov saqlanmoqda..." : "To‘lovni tekshirish"}
        </Button></DrawerFooter>
      </form>
    </Drawer>
    <ConfirmDialog
      open={Boolean(pendingPayload)}
      onOpenChange={(nextOpen) => { if (!nextOpen && !isSubmitting) setPendingPayload(null); }}
      title="Yetkazib beruvchi to‘lovini tasdiqlash"
      description={pendingPayload && selectedSupplier ? `${selectedSupplier.name} · ${formatCurrency(pendingPayload.amount)} · ${paymentMethodLabel(pendingPayload.method)} · ${pendingPayload.paymentDate ?? "bugun"}. Taqsimot: ${reviewPurchases}. Tasdiqlansa qarz ${formatCurrency(pendingPayload.amount)}ga kamayadi; ortiqcha to‘lov yoki taqsimlanmagan kreditga ruxsat yo‘q.` : "To‘lov ma’lumotlarini tekshiring."}
      confirmLabel="To‘lovni tasdiqlash"
      isPending={isSubmitting}
      errorMessage={errorMessage}
      onConfirm={async () => {
        if (!pendingPayload || !idempotencyKeyRef.current) return;
        const serializedPayload = JSON.stringify(pendingPayload);
        if (
          submittedPayloadRef.current !== null &&
          submittedPayloadRef.current !== serializedPayload
        ) {
          idempotencyKeyRef.current = crypto.randomUUID();
        }
        submittedPayloadRef.current = serializedPayload;
        await onSubmit(pendingPayload, idempotencyKeyRef.current);
        setPendingPayload(null);
      }}
    />
    </>
  );
}

function paymentMethodLabel(method: CreateSupplierPaymentPayload["method"]): string { if (method === "CASH") return "Naqd"; if (method === "TRANSFER") return "O‘tkazma"; return "Boshqa"; }

function buildPayload(values: PaymentFormValues): CreateSupplierPaymentPayload {
  return {
    supplierId: values.supplierId,
    amount: values.amount,
    method: values.method,
    paymentDate: normalizeOptional(values.paymentDate),
    note: normalizeOptional(values.note),
    allocations: values.allocations.map((allocation) => ({
      purchaseId: allocation.purchaseId,
      amount: allocation.amount,
    })),
  };
}

function normalizeOptional(value?: string): string | null {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}
