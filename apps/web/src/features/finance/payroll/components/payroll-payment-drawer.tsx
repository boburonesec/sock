"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PayrollItem, PayPayrollPeriodPayload } from "@/lib/api/finance";

const schema = z.object({
  payrollItemId: z.string().min(1, "Xodim payroll item tanlanishi shart."),
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
  items: PayrollItem[];
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: PayPayrollPeriodPayload) => Promise<void>;
}

export function PayrollPaymentDrawer({
  open,
  items,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
}: PayrollPaymentDrawerProps) {
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

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Payroll to‘lovi"
      description="To‘lov backend payroll snapshotiga yoziladi. Frontend oylik hisoblamaydi."
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) =>
          onSubmit({
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
            <option value="">Payroll item tanlang</option>
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
          {isSubmitting ? "To‘lanmoqda..." : "To‘lov qilish"}
        </Button>
      </form>
    </Drawer>
  );
}

function getTodayValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeOptional(value?: string): string | null {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}
