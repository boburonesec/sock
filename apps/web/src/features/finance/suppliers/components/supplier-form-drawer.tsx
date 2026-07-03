"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Supplier, SupplierPayload } from "@/lib/api/supplier";

const supplierFormSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Supplier nomi kiritilishi shart.")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormDrawerProps {
  mode: "create" | "edit";
  supplier: Supplier | null;
  open: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: SupplierPayload) => Promise<void>;
}

export function SupplierFormDrawer({
  mode,
  supplier,
  open,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
}: SupplierFormDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: { name: "", phone: "", notes: "" },
  });

  useEffect(() => {
    reset({
      name: mode === "edit" ? supplier?.name ?? "" : "",
      phone: mode === "edit" ? supplier?.phone ?? "" : "",
      notes: mode === "edit" ? supplier?.notes ?? "" : "",
    });
  }, [mode, open, reset, supplier]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Supplier qo‘shish" : "Supplierni tahrirlash"}
      description={
        mode === "create"
          ? "Yangi supplier Faol status bilan yaratiladi."
          : "Supplier sozlama ma’lumotlari yangilanadi."
      }
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => onSubmit(buildPayload(values)))}
      >
        <FormField
          htmlFor="supplierName"
          label="Supplier nomi"
          error={errors.name?.message}
          required
        >
          <Input
            id="supplierName"
            autoComplete="off"
            placeholder="Masalan: Ip yetkazib beruvchi"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </FormField>

        <FormField htmlFor="supplierPhone" label="Telefon">
          <Input
            id="supplierPhone"
            autoComplete="off"
            placeholder="+998..."
            disabled={isSubmitting}
            {...register("phone")}
          />
        </FormField>

        <FormField htmlFor="supplierNotes" label="Izoh">
          <Textarea
            id="supplierNotes"
            placeholder="Ixtiyoriy izoh"
            disabled={isSubmitting}
            {...register("notes")}
          />
        </FormField>

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            {errorMessage}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? "Saqlanmoqda..."
            : mode === "create"
              ? "Supplier yaratish"
              : "O‘zgarishni saqlash"}
        </Button>
      </form>
    </Drawer>
  );
}

function buildPayload(values: SupplierFormValues): SupplierPayload {
  return {
    name: values.name,
    phone: normalizeOptional(values.phone),
    notes: normalizeOptional(values.notes),
  };
}

function normalizeOptional(value?: string): string | null {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}
