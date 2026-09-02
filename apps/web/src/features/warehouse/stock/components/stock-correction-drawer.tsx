"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/lib/api/product";
import type {
  MaterialStock,
  StockCorrectionPayload,
  WarehouseZone,
} from "@/lib/api/warehouse";
import { formatWarehouseZoneName } from "@/lib/status-labels";

const stockCorrectionSchema = z
  .object({
    itemType: z.enum(["PRODUCT", "MATERIAL"], {
      required_error: "Item turi tanlanishi kerak.",
    }),
    productVariantId: z.string().optional(),
    materialId: z.string().optional(),
    warehouseZoneId: z.string().min(1, "Zona tanlanishi kerak."),
    newQuantity: z
      .string()
      .transform((value) => value.trim())
      .refine(
        (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
        "Yangi miqdor 0 yoki undan katta bo‘lishi kerak.",
      ),
    reason: z
      .string()
      .transform((value) => value.trim())
      .pipe(z.string().min(1, "Sabab kiritilishi shart.")),
  })
  .superRefine((values, ctx) => {
    if (values.itemType === "PRODUCT" && !values.productVariantId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productVariantId"],
        message: "Mahsulot varianti tanlanishi kerak.",
      });
    }

    if (values.itemType === "MATERIAL" && !values.materialId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["materialId"],
        message: "Material tanlanishi kerak.",
      });
    }
  });

type StockCorrectionFormValues = z.infer<typeof stockCorrectionSchema>;

interface StockCorrectionDrawerProps {
  open: boolean;
  products: Product[];
  materialStock: MaterialStock[];
  zones: WarehouseZone[];
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: StockCorrectionPayload) => Promise<void>;
}

export function StockCorrectionDrawer({
  open,
  products,
  materialStock,
  zones,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
}: StockCorrectionDrawerProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<StockCorrectionFormValues>({
    resolver: zodResolver(stockCorrectionSchema),
    defaultValues: {
      itemType: "PRODUCT",
      productVariantId: "",
      materialId: "",
      warehouseZoneId: "",
      newQuantity: "",
      reason: "",
    },
  });
  const itemType = useWatch({ control, name: "itemType" });
  const productVariants = products.flatMap((product) =>
    product.variants.map((variant) => ({
      ...variant,
      label: `${product.name} · ${variant.color.name} · ${variant.material.name} · ${variant.season.name}`,
    })),
  );
  const materialOptions = Array.from(
    new Map(
      materialStock.map((stock) => [
        stock.material.id,
        {
          id: stock.material.id,
          name: stock.material.name,
          unit: stock.unit,
        },
      ]),
    ).values(),
  );

  useEffect(() => {
    if (!open) {
      reset({
        itemType: "PRODUCT",
        productVariantId: "",
        materialId: "",
        warehouseZoneId: "",
        newQuantity: "",
        reason: "",
      });
    }
  }, [open, reset]);

  useEffect(() => {
    if (itemType === "PRODUCT") {
      setValue("materialId", "");
    } else {
      setValue("productVariantId", "");
    }
  }, [itemType, setValue]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Qoldiqni tuzatish"
      description="Joriy qoldiqni tuzatadi va ombor harakatlari tarixiga yozadi."
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => onSubmit(buildPayload(values)))}
      >
        <FormField
          htmlFor="stockCorrectionItemType"
          label="Nima tuzatiladi"
          error={errors.itemType?.message}
          required
        >
          <Select
            id="stockCorrectionItemType"
            disabled={isSubmitting}
            {...register("itemType")}
          >
            <option value="PRODUCT">Tayyor mahsulot</option>
            <option value="MATERIAL">Material</option>
          </Select>
        </FormField>

        {itemType === "PRODUCT" ? (
          <FormField
            htmlFor="stockCorrectionProductVariantId"
            label="Mahsulot varianti"
            error={errors.productVariantId?.message}
            required
          >
            <Select
              id="stockCorrectionProductVariantId"
              defaultValue=""
              disabled={isSubmitting || productVariants.length === 0}
              {...register("productVariantId")}
            >
              <option value="" disabled>
                Tanlang
              </option>
              {productVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.label}
                </option>
              ))}
            </Select>
          </FormField>
        ) : (
          <FormField
            htmlFor="stockCorrectionMaterialId"
            label="Material"
            error={errors.materialId?.message}
            required
          >
            <Select
              id="stockCorrectionMaterialId"
              defaultValue=""
              disabled={isSubmitting || materialOptions.length === 0}
              {...register("materialId")}
            >
              <option value="" disabled>
                Tanlang
              </option>
              {materialOptions.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name} · {material.unit}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField
          htmlFor="stockCorrectionWarehouseZoneId"
          label="Zona"
          error={errors.warehouseZoneId?.message}
          required
        >
          <Select
            id="stockCorrectionWarehouseZoneId"
            defaultValue=""
            disabled={isSubmitting || zones.length === 0}
            {...register("warehouseZoneId")}
          >
            <option value="" disabled>
              Tanlang
            </option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {formatWarehouseZoneName(zone.warehouse.name)} · {formatWarehouseZoneName(zone.name)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          htmlFor="stockCorrectionNewQuantity"
          label="Yangi miqdor"
          error={errors.newQuantity?.message}
          required
        >
          <Input
            id="stockCorrectionNewQuantity"
            type="number"
            min="0"
            step={itemType === "PRODUCT" ? "1" : "0.001"}
            placeholder={itemType === "PRODUCT" ? "Masalan: 120" : "Masalan: 25.5"}
            disabled={isSubmitting}
            {...register("newQuantity")}
          />
        </FormField>

        <FormField
          htmlFor="stockCorrectionReason"
          label="Sabab"
          error={errors.reason?.message}
          required
        >
          <Textarea
            id="stockCorrectionReason"
            placeholder="Masalan: fizik sanoq natijasida tuzatildi"
            disabled={isSubmitting}
            {...register("reason")}
          />
        </FormField>

        {itemType === "MATERIAL" && materialOptions.length === 0 ? (
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Material qoldig‘ini tuzatish uchun avval shu material bo‘yicha qoldiq
            mavjud bo‘lishi kerak. Material qabul qilish orqali qoldiq yarating.
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
          disabled={
            isSubmitting ||
            zones.length === 0 ||
            (itemType === "PRODUCT" && productVariants.length === 0) ||
            (itemType === "MATERIAL" && materialOptions.length === 0)
          }
        >
          {isSubmitting ? "Tuzatilmoqda..." : "Qoldiqni tuzatish"}
        </Button>
      </form>
    </Drawer>
  );
}

function buildPayload(
  values: StockCorrectionFormValues,
): StockCorrectionPayload {
  return {
    itemType: values.itemType,
    productVariantId:
      values.itemType === "PRODUCT" ? values.productVariantId : null,
    materialId: values.itemType === "MATERIAL" ? values.materialId : null,
    warehouseZoneId: values.warehouseZoneId,
    newQuantity: values.newQuantity,
    reason: values.reason,
  };
}
