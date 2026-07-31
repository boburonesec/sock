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
import type { MasterDataItem } from "@/lib/api/product";
import type {
  MaterialReceiptPayload,
  WarehouseZone,
} from "@/lib/api/warehouse";

const materialReceiptFormSchema = z.object({
  materialId: z.string().min(1, "Material tanlanishi kerak."),
  quantity: z
    .string()
    .transform((value) => value.trim())
    .refine(
      (value) => Number.isFinite(Number(value)) && Number(value) > 0,
      "Miqdor musbat son bo‘lishi kerak.",
    ),
  unit: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Birlik kiritilishi shart.")),
  warehouseZoneId: z.string().optional(),
  note: z.string().optional(),
});

type MaterialReceiptFormValues = z.infer<typeof materialReceiptFormSchema>;

interface MaterialReceiptDrawerProps {
  open: boolean;
  materials: MasterDataItem[];
  zones: WarehouseZone[];
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MaterialReceiptPayload) => Promise<void>;
}

export function MaterialReceiptDrawer({
  open,
  materials,
  zones,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
}: MaterialReceiptDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MaterialReceiptFormValues>({
    resolver: zodResolver(materialReceiptFormSchema),
    defaultValues: {
      materialId: "",
      quantity: "",
      unit: "",
      warehouseZoneId: "",
      note: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        materialId: "",
        quantity: "",
        unit: "",
        warehouseZoneId: "",
        note: "",
      });
    }
  }, [open, reset]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Material qabul qilish"
      description="Xomashyo kirimi ombor qoldig‘ini oshiradi va harakatlar tarixiga yoziladi."
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => onSubmit(buildPayload(values)))}
      >
        <FormField
          htmlFor="materialReceiptMaterialId"
          label="Material"
          error={errors.materialId?.message}
          required
        >
          <Select
            id="materialReceiptMaterialId"
            defaultValue=""
            disabled={isSubmitting || materials.length === 0}
            aria-invalid={Boolean(errors.materialId)}
            {...register("materialId")}
          >
            <option value="" disabled>
              Tanlang
            </option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            htmlFor="materialReceiptQuantity"
            label="Miqdor"
            error={errors.quantity?.message}
            required
          >
            <Input
              id="materialReceiptQuantity"
              type="number"
              min="0.001"
              step="0.001"
              placeholder="Masalan: 25.5"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.quantity)}
              {...register("quantity")}
            />
          </FormField>

          <FormField
            htmlFor="materialReceiptUnit"
            label="Birlik"
            error={errors.unit?.message}
            required
          >
            <Input
              id="materialReceiptUnit"
              placeholder="kg, roll, dona..."
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.unit)}
              {...register("unit")}
            />
          </FormField>
        </div>

        <FormField htmlFor="materialReceiptZoneId" label="Zona">
          <Select
            id="materialReceiptZoneId"
            defaultValue=""
            disabled={isSubmitting}
            {...register("warehouseZoneId")}
          >
            <option value="">Raw Materials zonasi avtomatik</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.warehouse.name} · {zone.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField htmlFor="materialReceiptNote" label="Izoh">
          <Textarea
            id="materialReceiptNote"
            placeholder="Ixtiyoriy izoh"
            disabled={isSubmitting}
            {...register("note")}
          />
        </FormField>

        {materials.length === 0 ? (
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Material qabul qilish uchun avval asosiy ma’lumotlarda material mavjud
            bo‘lishi kerak.
          </p>
        ) : null}

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            {errorMessage}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || materials.length === 0}
        >
          {isSubmitting ? "Qabul qilinmoqda..." : "Materialni qabul qilish"}
        </Button>
      </form>
    </Drawer>
  );
}

function buildPayload(
  values: MaterialReceiptFormValues,
): MaterialReceiptPayload {
  const note = values.note?.trim();

  return {
    materialId: values.materialId,
    quantity: values.quantity,
    unit: values.unit,
    warehouseZoneId: values.warehouseZoneId || null,
    note: note ? note : undefined,
  };
}
