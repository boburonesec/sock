"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Drawer, DrawerFooter } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MasterDataItem } from "@/lib/api/product";
import type {
  MaterialReceiptPayload,
  MaterialReceipt,
  WarehouseZone,
} from "@/lib/api/warehouse";
import { formatWarehouseZoneName } from "@/lib/status-labels";
import { useAuthStore } from "@/stores/auth-store";

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
  warehouseZoneId: z.string().min(1, "Ombor joyi tanlanishi kerak."),
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
  onSubmit: (payload: MaterialReceiptPayload) => Promise<MaterialReceipt>;
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
  const submissionRef = useRef(false);
  const activeFactoryId = useAuthStore((state) => state.activeFactoryId);
  const accessibleFactories = useAuthStore((state) => state.accessibleFactories);
  const activeFactoryName =
    accessibleFactories.find((factory) => factory.id === activeFactoryId)?.name ??
    "Fabrika tanlanmagan";
  const {
    register,
    handleSubmit,
    reset,
    watch,
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
  const selectedMaterialId = watch("materialId");
  const selectedZoneId = watch("warehouseZoneId");
  const quantity = watch("quantity");
  const unit = watch("unit");
  const selectedMaterial = materials.find((item) => item.id === selectedMaterialId);
  const selectedZone = zones.find((item) => item.id === selectedZoneId);

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
      <form className="space-y-4 flex flex-col h-full min-h-[min-content]"
        onSubmit={handleSubmit(async (values) => {
          if (submissionRef.current) return;
          submissionRef.current = true;
          try {
            await onSubmit(buildPayload(values));
          } finally {
            submissionRef.current = false;
          }
        })}
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

        <FormField
          htmlFor="materialReceiptZoneId"
          label="Ombor joyi"
          error={errors.warehouseZoneId?.message}
          required
        >
          <Select
            id="materialReceiptZoneId"
            defaultValue=""
            disabled={isSubmitting}
            {...register("warehouseZoneId")}
          >
            <option value="">Ombor va joyni tanlang</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {formatWarehouseZoneName(zone.warehouse.name)} · {formatWarehouseZoneName(zone.name)}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm">
          <p className="font-semibold">Qabul qilishdan oldin tekshiring</p>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Fabrika</dt><dd>{activeFactoryName}</dd></div>
            <div><dt className="text-muted-foreground">Ombor</dt><dd>{selectedZone ? formatWarehouseZoneName(selectedZone.warehouse.name) : "Tanlanmagan"}</dd></div>
            <div><dt className="text-muted-foreground">Ombor joyi</dt><dd>{selectedZone ? formatWarehouseZoneName(selectedZone.name) : "Tanlanmagan"}</dd></div>
            <div><dt className="text-muted-foreground">Material</dt><dd>{selectedMaterial?.name ?? "Tanlanmagan"}</dd></div>
            <div><dt className="text-muted-foreground">Miqdor va birlik</dt><dd>{quantity && unit ? `${quantity} ${unit}` : "—"}</dd></div>
          </dl>
        </div>

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

        <DrawerFooter><Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || materials.length === 0 || !selectedZone}
        >
          {isSubmitting ? "Qabul qilinmoqda..." : "Materialni qabul qilish"}
        </Button></DrawerFooter>
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
    warehouseZoneId: values.warehouseZoneId,
    note: note ? note : undefined,
  };
}
