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
  stageIds: z.array(z.string()),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface EmployeeFormDrawerProps {
  mode: "create" | "edit";
  employee: Employee | null;
  open: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  stageOptions: Array<{ id: string; name: string; sortOrder: number }>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
}

export function EmployeeFormDrawer({
  mode,
  employee,
  open,
  isSubmitting,
  errorMessage,
  stageOptions,
  onOpenChange,
  onSubmit,
}: EmployeeFormDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: "",
      stageIds: [],
    },
  });

  const selectedStageIds = watch("stageIds") ?? [];

  useEffect(() => {
    reset({
      name: mode === "edit" ? employee?.name ?? "" : "",
      stageIds:
        mode === "edit" ? (employee?.stages ?? []).map((stage) => stage.id) : [],
    });
  }, [employee, mode, open, reset]);

  const title = mode === "create" ? "Xodim qo‘shish" : "Xodimni tahrirlash";
  const description =
    mode === "create"
      ? "Ism va qaysi bosqich(lar)da ishlashini belgilang."
      : "Ism yoki ish bosqichlarini yangilang.";

  function toggleStage(stageId: string) {
    const next = selectedStageIds.includes(stageId)
      ? selectedStageIds.filter((id) => id !== stageId)
      : [...selectedStageIds, stageId];
    setValue("stageIds", next, { shouldDirty: true });
  }

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
            placeholder="Masalan: Ali Averlogchi"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </FormField>

        <div className="space-y-2">
          <p className="text-sm font-medium">
            Qaysi ishda ishlaydi? <span className="text-muted-foreground">(bir yoki bir nechta)</span>
          </p>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
            {stageOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Bosqichlar topilmadi. Avval sozlamalarda bosqichlar bo‘lishi kerak.
              </p>
            ) : (
              stageOptions.map((stage) => {
                const checked = selectedStageIds.includes(stage.id);
                return (
                  <label
                    key={stage.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      disabled={isSubmitting}
                      onChange={() => toggleStage(stage.id)}
                    />
                    <span className="text-sm">
                      {stage.sortOrder}. {stage.name}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

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
