"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Drawer } from "@/components/overlays/drawer";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PayrollItem, PayPayrollPeriodPayload } from "@/lib/api/finance";

const schema = z.object({
  payrollItemId: z.string().min(1, "Xodim ish haqi qatori tanlanishi shart."),
  amount: z
    .string()
    .trim()
    .min(1, "To‘lov summasi kiritilishi shart.")
    .refine((value) => Number(value) > 0, "To‘lov summasi musbat bo‘lishi kerak."),
  method: z.enum(["CASH", "TRANSFER", "OTHER"]),
  paidAt: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PayrollPaymentDrawerProps {
  open: boolean;
  periodLabel: string;
  items: PayrollItem[];
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: PayPayrollPeriodPayload) => Promise<void>;
}

export function PayrollPaymentDrawer({
  open,
  periodLabel,
  items,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
}: PayrollPaymentDrawerProps) {
  const [pendingPayload, setPendingPayload] = useState<PayPayrollPeriodPayload | null>(null);
  const payableItems = items.filter((item) => Number(item.remainingAmount) > 0);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      payrollItemId: "",
      amount: "",
      method: "CASH",
      paidAt: getTodayValue(),
      note: "",
    },
  });
  const selectedItem = payableItems.find(
    (item) => item.id === watch("payrollItemId"),
  );

  useEffect(() => {
    if (open) {
      setPendingPayload(null);
      reset({
        payrollItemId: "",
        amount: "",
        method: "CASH",
        paidAt: getTodayValue(),
        note: "",
      });
    }
  }, [open, reset]);

  useEffect(() => {
    if (selectedItem) {
      setValue("amount", selectedItem.remainingAmount);
    }
  }, [selectedItem, setValue]);

  const paymentEmployee = payableItems.find((item) => item.id === pendingPayload?.payrollItemId);

  return (
    <>
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Ish haqi to‘lovi"
      description="To‘lov tanlangan xodimning ish haqi qoldig‘iga yoziladi."
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) =>
          setPendingPayload({
            payrollItemId: values.payrollItemId,
            amount: values.amount,
            method: values.method,
            paidAt: values.paidAt || null,
            note: normalizeOptional(values.note),
          }),
        )}
      >
        <FormField
          htmlFor="payrollItem"
          label="Xodim"
          error={errors.payrollItemId?.message}
          required
        >
          <Select
            id="payrollItem"
            disabled={isSubmitting}
            {...register("payrollItemId")}
          >
            <option value="">Xodim tanlang</option>
            {payableItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.employee.name} — qoldiq {item.remainingAmount} so‘m
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          htmlFor="payrollPaymentAmount"
          label="Summa"
          error={errors.amount?.message}
          required
        >
          <Input
            id="payrollPaymentAmount"
            inputMode="decimal"
            disabled={isSubmitting}
            {...register("amount")}
          />
        </FormField>

        <FormField
          htmlFor="payrollPaymentMethod"
          label="To‘lov turi"
          error={errors.method?.message}
          required
        >
          <Select
            id="payrollPaymentMethod"
            disabled={isSubmitting}
            {...register("method")}
          >
            <option value="CASH">Naqd</option>
            <option value="TRANSFER">Bank o‘tkazma</option>
            <option value="OTHER">Boshqa</option>
          </Select>
        </FormField>

        <FormField htmlFor="payrollPaidAt" label="To‘lov sanasi">
          <Input
            id="payrollPaidAt"
            type="date"
            disabled={isSubmitting}
            {...register("paidAt")}
          />
        </FormField>

        <FormField htmlFor="payrollPaymentNote" label="Izoh">
          <Textarea
            id="payrollPaymentNote"
            placeholder="Ixtiyoriy izoh"
            disabled={isSubmitting}
            {...register("note")}
          />
        </FormField>

        {errorMessage ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {errorMessage}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || payableItems.length === 0}
        >
          {isSubmitting ? "To‘lanmoqda..." : "To‘lovni tekshirish"}
        </Button>
      </form>
    </Drawer>
    <ConfirmDialog
      open={Boolean(pendingPayload)}
      onOpenChange={(nextOpen) => { if (!nextOpen && !isSubmitting) setPendingPayload(null); }}
      title="Ish haqi to‘lovini tasdiqlash"
      description={pendingPayload && paymentEmployee ? `${periodLabel} · ${paymentEmployee.employee.name} · ${pendingPayload.amount} so‘m · ${paymentMethodLabel(pendingPayload.method)} · ${pendingPayload.paidAt ?? "bugun"}. Tasdiqlangandan keyin to‘lov yozuvi yaratiladi.` : "To‘lov ma’lumotlarini tekshiring."}
      confirmLabel="To‘lovni tasdiqlash"
      isPending={isSubmitting}
      errorMessage={errorMessage}
      onConfirm={async () => {
        if (!pendingPayload) return;
        await onSubmit(pendingPayload);
        setPendingPayload(null);
      }}
    />
    </>
  );
}

function paymentMethodLabel(method: PayPayrollPeriodPayload["method"]): string {
  if (method === "CASH") return "Naqd";
  if (method === "TRANSFER") return "Bank o‘tkazma";
  return "Boshqa";
}

function getTodayValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeOptional(value?: string): string | null {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}
