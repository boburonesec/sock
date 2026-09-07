"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import type { Client, ClientPayload } from "@/lib/api/sales";
import {
  extractDigits,
  formatUzPhone,
  isValidUzPhone,
  normalizeUzPhone,
} from "@/lib/phone";

const clientFormSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Mijoz nomi kiritilishi shart.")),
  phone: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const digits = extractDigits(val);
      if (digits.length === 0 || digits === "998") return true;
      return isValidUzPhone(val);
    }, "Telefon raqam to‘liq kiritilishi shart (+998 XX XXX XX XX)."),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormDrawerProps {
  mode: "create" | "edit";
  client: Client | null;
  open: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ClientPayload) => Promise<void>;
}

export function ClientFormDrawer({
  mode,
  client,
  open,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
}: ClientFormDrawerProps) {
  const [inFlight, setInFlight] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  const effectiveSubmitting = isSubmitting || isFormSubmitting || inFlight;

  useEffect(() => {
    if (!open) return;
    reset({
      name: mode === "edit" ? client?.name ?? "" : "",
      phone: mode === "edit" ? (client?.phone ? formatUzPhone(client.phone) : "") : "",
      address: mode === "edit" ? client?.address ?? "" : "",
      notes: mode === "edit" ? client?.notes ?? "" : "",
    });
  }, [client, mode, open, reset]);

  const title = mode === "create" ? "Mijoz qo‘shish" : "Mijozni tahrirlash";
  const description =
    mode === "create"
      ? "Yangi mijoz faol holatda yaratiladi."
      : "Mijoz ma’lumotlari yangilanadi.";

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          if (effectiveSubmitting) return;
          setInFlight(true);
          try {
            await onSubmit(buildPayload(values));
          } finally {
            setInFlight(false);
          }
        })}
      >
        <FormField
          htmlFor="clientName"
          label="Mijoz nomi"
          error={errors.name?.message}
          required
        >
          <Input
            id="clientName"
            autoComplete="off"
            placeholder="Masalan: Samarqand Optom"
            disabled={effectiveSubmitting}
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </FormField>

        <FormField htmlFor="clientPhone" label="Telefon" error={errors.phone?.message}>
          <PhoneInput
            id="clientPhone"
            disabled={effectiveSubmitting}
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
        </FormField>

        <FormField htmlFor="clientAddress" label="Manzil">
          <Input
            id="clientAddress"
            autoComplete="off"
            placeholder="Ixtiyoriy"
            disabled={effectiveSubmitting}
            {...register("address")}
          />
        </FormField>

        <FormField htmlFor="clientNotes" label="Izoh">
          <Textarea
            id="clientNotes"
            placeholder="Ixtiyoriy izoh"
            disabled={effectiveSubmitting}
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

        <Button type="submit" className="w-full" disabled={effectiveSubmitting}>
          {effectiveSubmitting
            ? "Saqlanmoqda..."
            : mode === "create"
              ? "Mijoz yaratish"
              : "O‘zgarishni saqlash"}
        </Button>
      </form>
    </Drawer>
  );
}

function buildPayload(values: ClientFormValues): ClientPayload {
  return {
    name: values.name.trim(),
    phone: normalizeUzPhone(values.phone),
    address: normalizeOptional(values.address),
    notes: normalizeOptional(values.notes),
  };
}

function normalizeOptional(value?: string): string | null {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}
