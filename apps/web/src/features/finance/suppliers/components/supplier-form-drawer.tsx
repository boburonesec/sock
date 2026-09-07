"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Drawer, DrawerFooter } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import type { Supplier, SupplierPayload } from "@/lib/api/supplier";
import {
  extractDigits,
  formatUzPhone,
  isValidUzPhone,
  normalizeUzPhone,
} from "@/lib/phone";

const supplierFormSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Yetkazib beruvchi nomi kiritilishi shart.")),
  phone: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const digits = extractDigits(val);
      if (digits.length === 0 || digits === "998") return true;
      return isValidUzPhone(val);
    }, "Telefon raqam to‘liq kiritilishi shart (+998 XX XXX XX XX)."),
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
    if (!open) return;
    reset({
      name: mode === "edit" ? supplier?.name ?? "" : "",
      phone: mode === "edit" ? (supplier?.phone ? formatUzPhone(supplier.phone) : "") : "",
      notes: mode === "edit" ? supplier?.notes ?? "" : "",
    });
  }, [mode, open, reset, supplier]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Yetkazib beruvchi qo‘shish" : "Yetkazib beruvchini tahrirlash"}
      description={
        mode === "create"
          ? "Yangi yetkazib beruvchi faol holatda yaratiladi."
          : "Yetkazib beruvchi ma’lumotlari yangilanadi."
      }
    >
      <form className="space-y-4 flex flex-col h-full min-h-[min-content]"
        onSubmit={handleSubmit((values) => onSubmit(buildPayload(values)))}
      >
        <FormField
          htmlFor="supplierName"
          label="Yetkazib beruvchi nomi"
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

        <FormField htmlFor="supplierPhone" label="Telefon" error={errors.phone?.message}>
          <PhoneInput
            id="supplierPhone"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.phone)}
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

        <DrawerFooter><Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? "Saqlanmoqda..."
            : mode === "create"
              ? "Yetkazib beruvchi yaratish"
              : "O‘zgarishni saqlash"}
        </Button></DrawerFooter>
      </form>
    </Drawer>
  );
}

function buildPayload(values: SupplierFormValues): SupplierPayload {
  return {
    name: values.name.trim(),
    phone: normalizeUzPhone(values.phone),
    notes: normalizeOptional(values.notes),
  };
}

function normalizeOptional(value?: string): string | null {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}
