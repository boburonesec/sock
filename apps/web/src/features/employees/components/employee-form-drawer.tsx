"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { Employee } from "@/lib/api/employees";

const employeeFormSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Ism kiritilishi shart.")),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface EmployeeFormDrawerProps {
  mode: "create" | "edit";
  employee: Employee | null;
  open: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
}

export function EmployeeFormDrawer({
  mode,
  employee,
  open,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
}: EmployeeFormDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    reset({
      name: mode === "edit" ? employee?.name ?? "" : "",
    });
  }, [employee?.name, mode, open, reset]);

  const title = mode === "create" ? "Xodim qo‘shish" : "Xodimni tahrirlash";
  const description =
    mode === "create"
      ? "Yangi xodim ACTIVE status bilan yaratiladi."
      : "Faqat xodim master-data maydonlari tahrirlanadi.";

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormField
          htmlFor="employeeName"
          label="Ism"
          error={errors.name?.message}
          required
        >
          <Input
            id="employeeName"
            autoComplete="off"
            placeholder="Masalan: Ali Valiyev"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </FormField>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            {errorMessage}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? "Saqlanmoqda..."
            : mode === "create"
              ? "Xodim yaratish"
              : "O‘zgarishni saqlash"}
        </Button>
      </form>
    </Drawer>
  );
}
