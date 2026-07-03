"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

const schema = z.object({
  month: z.string().min(1, "Oy tanlanishi shart."),
});

type FormValues = z.infer<typeof schema>;

interface PayrollPeriodDrawerProps {
  open: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { month: string }) => Promise<void>;
}

export function PayrollPeriodDrawer({
  open,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
}: PayrollPeriodDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { month: getCurrentMonthValue() },
  });

  useEffect(() => {
    if (open) reset({ month: getCurrentMonthValue() });
  }, [open, reset]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Ish haqi davri yaratish"
      description="Yangi davr tayyor holatda yaratiladi."
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => onSubmit({ month: values.month }))}
      >
        <FormField
          htmlFor="payrollMonth"
          label="Oy"
          error={errors.month?.message}
          required
        >
          <Input
            id="payrollMonth"
            type="month"
            disabled={isSubmitting}
            {...register("month")}
          />
        </FormField>

        {errorMessage ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {errorMessage}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Yaratilmoqda..." : "Davr yaratish"}
        </Button>
      </form>
    </Drawer>
  );
}

function getCurrentMonthValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${now.getFullYear()}-${month}`;
}
