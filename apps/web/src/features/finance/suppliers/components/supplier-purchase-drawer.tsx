"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Drawer, DrawerFooter } from "@/components/overlays/drawer";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MasterDataItem } from "@/lib/api/product";
import type {
  CreateSupplierPurchasePayload,
  Supplier,
} from "@/lib/api/supplier";

const purchaseItemSchema = z.object({
  materialId: z.string().min(1, "Material tanlanishi shart."),
  quantity: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => Number(value) > 0, "Miqdor musbat bo‘lishi kerak."),
  unit: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Birlik kiritilishi shart.")),
  unitPrice: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => Number(value) > 0, "Birlik narx musbat bo‘lishi kerak."),
});

const purchaseFormSchema = z.object({
  supplierId: z.string().min(1, "Yetkazib beruvchi tanlanishi shart."),
  purchaseDate: z.string().optional(),
  note: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "Kamida bitta material qo‘shing."),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface SupplierPurchaseDrawerProps {
  open: boolean;
  suppliers: Supplier[];
  materials: MasterDataItem[];
  isSubmitting: boolean;
  isOptionsLoading: boolean;
  initialSupplierId?: string | null;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateSupplierPurchasePayload) => Promise<void>;
}

export function SupplierPurchaseDrawer({
  open,
  suppliers,
  materials,
  isSubmitting,
  isOptionsLoading,
  initialSupplierId,
  errorMessage,
  onOpenChange,
  onSubmit,
}: SupplierPurchaseDrawerProps) {
  const [pendingPayload, setPendingPayload] = useState<CreateSupplierPurchasePayload | null>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplierId: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      note: "",
      items: [{ materialId: "", quantity: "", unit: "kg", unitPrice: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  useEffect(() => {
    if (open) {
      setPendingPayload(null);
      reset({
        supplierId: initialSupplierId ?? "",
        purchaseDate: new Date().toISOString().slice(0, 10),
        note: "",
        items: [{ materialId: "", quantity: "", unit: "kg", unitPrice: "" }],
      });
    }
  }, [initialSupplierId, open, reset]);

  const estimatedTotal = watchedItems.reduce((total, item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
      return total;
    }

    return total + quantity * unitPrice;
  }, 0);
  const formDisabled = isSubmitting || isOptionsLoading;
  const selectedSupplier = suppliers.find((supplier) => supplier.id === watch("supplierId"));

  return (
    <>
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Xarid qayd qilish"
      description="Xarid summasi tizim tomonidan hisoblanadi. Bu amal material ombor qoldig‘ini oshirmaydi."
      className="max-w-4xl"
    >
      <form className="space-y-5 flex flex-col h-full min-h-[min-content]"
        onSubmit={handleSubmit((values) => setPendingPayload(buildPayload(values)))}
      >
        {initialSupplierId && selectedSupplier ? <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2"><p className="text-xs text-muted-foreground">Tanlangan yetkazib beruvchi</p><p className="font-semibold">{selectedSupplier.name}</p></div> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            htmlFor="purchaseSupplier"
            label="Yetkazib beruvchi"
            error={errors.supplierId?.message}
            required
          >
            <Select
              id="purchaseSupplier"
              disabled={formDisabled || Boolean(initialSupplierId)}
              aria-invalid={Boolean(errors.supplierId)}
              {...register("supplierId")}
            >
              <option value="">Yetkazib beruvchi tanlang</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField htmlFor="purchaseDate" label="Xarid sanasi">
            <Input
              id="purchaseDate"
              type="date"
              disabled={formDisabled}
              {...register("purchaseDate")}
            />
          </FormField>
        </div>

        <section className="space-y-3 rounded-xl border bg-muted/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Materiallar</p>
              <p className="text-xs text-muted-foreground">
                Xarid qoldiqni oshirmaydi; material qabul qilish alohida amal.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={formDisabled}
              onClick={() =>
                append({ materialId: "", quantity: "", unit: "kg", unitPrice: "" })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Qator qo‘shish
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg border bg-card/60 p-3 md:grid-cols-[1fr_120px_100px_160px_auto]"
              >
                <FormField
                  htmlFor={`purchaseMaterial-${field.id}`}
                  label="Material"
                  error={errors.items?.[index]?.materialId?.message}
                  required
                >
                  <Select
                    id={`purchaseMaterial-${field.id}`}
                    disabled={formDisabled}
                    aria-invalid={Boolean(errors.items?.[index]?.materialId)}
                    {...register(`items.${index}.materialId`)}
                  >
                    <option value="">Material tanlang</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  htmlFor={`purchaseQuantity-${field.id}`}
                  label="Miqdor"
                  error={errors.items?.[index]?.quantity?.message}
                  required
                >
                  <Input
                    id={`purchaseQuantity-${field.id}`}
                    type="number"
                    min={0}
                    step="0.001"
                    disabled={formDisabled}
                    aria-invalid={Boolean(errors.items?.[index]?.quantity)}
                    {...register(`items.${index}.quantity`)}
                  />
                </FormField>

                <FormField
                  htmlFor={`purchaseUnit-${field.id}`}
                  label="Birlik"
                  error={errors.items?.[index]?.unit?.message}
                  required
                >
                  <Input
                    id={`purchaseUnit-${field.id}`}
                    placeholder="kg"
                    disabled={formDisabled}
                    aria-invalid={Boolean(errors.items?.[index]?.unit)}
                    {...register(`items.${index}.unit`)}
                  />
                </FormField>

                <FormField
                  htmlFor={`purchaseUnitPrice-${field.id}`}
                  label="Birlik narx"
                  error={errors.items?.[index]?.unitPrice?.message}
                  required
                >
                  <Input
                    id={`purchaseUnitPrice-${field.id}`}
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={formDisabled}
                    aria-invalid={Boolean(errors.items?.[index]?.unitPrice)}
                    {...register(`items.${index}.unitPrice`)}
                  />
                </FormField>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={formDisabled || fields.length === 1}
                    onClick={() => remove(index)}
                    aria-label="Xarid qatorini o‘chirish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <FormField htmlFor="purchaseNote" label="Izoh">
          <Textarea
            id="purchaseNote"
            placeholder="Ixtiyoriy izoh"
            disabled={formDisabled}
            {...register("note")}
          />
        </FormField>

        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
          Taxminiy summa: {estimatedTotal.toLocaleString("uz-UZ")} so‘m. Yakuniy summa tizim tomonidan qaytariladi.
        </div>

        {errorMessage ? (
          <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {errorMessage}
          </p>
        ) : null}

        <DrawerFooter><Button
          type="submit"
          className="w-full"
          disabled={formDisabled || suppliers.length === 0 || materials.length === 0}
        >
          {isSubmitting ? "Xarid saqlanmoqda..." : "Xaridni tekshirish"}
        </Button></DrawerFooter>
      </form>
    </Drawer>
    <ConfirmDialog
      open={Boolean(pendingPayload)}
      onOpenChange={(nextOpen) => { if (!nextOpen && !isSubmitting) setPendingPayload(null); }}
      title="Xaridni tasdiqlash"
      description={pendingPayload && selectedSupplier ? `${selectedSupplier.name} · ${pendingPayload.purchaseDate ?? "bugun"} · ${pendingPayload.items.length} ta material · taxminiy ${estimatedTotal.toLocaleString("uz-UZ")} so‘m. Server yakuniy summani satrlardan hisoblaydi va bu summa yetkazib beruvchi qarzini oshiradi; ombor qoldig‘i o‘zgarmaydi.` : "Xarid ma’lumotlarini tekshiring."}
      confirmLabel="Xaridni tasdiqlash"
      isPending={isSubmitting}
      errorMessage={errorMessage}
      onConfirm={async () => { if (!pendingPayload) return; await onSubmit(pendingPayload); setPendingPayload(null); }}
    />
    </>
  );
}

function buildPayload(values: PurchaseFormValues): CreateSupplierPurchasePayload {
  return {
    supplierId: values.supplierId,
    purchaseDate: normalizeOptional(values.purchaseDate),
    note: normalizeOptional(values.note),
    items: values.items.map((item) => ({
      materialId: item.materialId,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
    })),
  };
}

function normalizeOptional(value?: string): string | null {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}
