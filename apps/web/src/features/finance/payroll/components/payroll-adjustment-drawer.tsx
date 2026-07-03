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
import type { Employee } from "@/lib/api/employees";

export type PayrollAdjustmentKind = "advance" | "bonus" | "penalty";

const schema = z.object({
  employeeId: z.string().min(1, "Xodim tanlanishi shart."),
  amount: z
    .string()
    .trim()
    .min(1, "Summa kiritilishi shart.")
    .refine((value) => Number(value) > 0, "Summa musbat bo‘lishi kerak."),
  reason: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(3, "Sabab kamida 3 ta belgidan iborat bo‘lishi kerak.")),
});

type FormValues = z.infer<typeof schema>;

interface PayrollAdjustmentDrawerProps {
  kind: PayrollAdjustmentKind;
  open: boolean;
  employees: Employee[];
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    employeeId: string;
    amount: string;
    reason: string;
  }) => Promise<void>;
}

const labels: Record<PayrollAdjustmentKind, string> = {
  advance: "Avans",
  bonus: "Bonus",
  penalty: "Jarima",
};

export function PayrollAdjustmentDrawer({
  kind,
  open,
  employees,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
}: PayrollAdjustmentDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employeeId: "", amount: "", reason: "" },
  });

  useEffect(() => {
    if (open) reset({ employeeId: "", amount: "", reason: "" });
  }, [open, reset]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={`${labels[kind]} qo‘shish`}
      description="Bu tuzatish ish haqi hisoblashda inobatga olinadi."
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormField
          htmlFor="adjustmentEmployee"
          label="Xodim"
          error={errors.employeeId?.message}
          required
        >
          <Select
            id="adjustmentEmployee"
            disabled={isSubmitting}
            {...register("employeeId")}
          >
            <option value="">Xodim tanlang</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          htmlFor="adjustmentAmount"
          label="Summa"
          error={errors.amount?.message}
          required
        >
          <Input
            id="adjustmentAmount"
            inputMode="decimal"
            placeholder="Masalan: 50000"
            disabled={isSubmitting}
            {...register("amount")}
          />
        </FormField>

        <FormField
          htmlFor="adjustmentReason"
          label="Sabab"
          error={errors.reason?.message}
          required
        >
          <Textarea
            id="adjustmentReason"
            placeholder="Qisqa izoh"
            disabled={isSubmitting}
            {...register("reason")}
          />
        </FormField>

        {errorMessage ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {errorMessage}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saqlanmoqda..." : `${labels[kind]} qo‘shish`}
        </Button>
      </form>
    </Drawer>
  );
}
