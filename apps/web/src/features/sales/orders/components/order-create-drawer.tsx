"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ProductVariantReference } from "@/lib/api/types";
import type {
  Client,
  CreateSalesOrderPayload,
} from "@/lib/api/sales";

const orderItemSchema = z.object({
  productVariantId: z.string().min(1, "Mahsulot varianti tanlanishi shart."),
  quantity: z.coerce
    .number({ invalid_type_error: "Miqdor raqam bo‘lishi kerak." })
    .int("Miqdor butun son bo‘lishi kerak.")
    .min(1, "Miqdor 1 dan katta bo‘lishi kerak."),
  unitPrice: z
    .string()
    .transform((value) => value?.trim() ?? "")
    .refine(
      (value) => value.length === 0 || Number(value) > 0,
      "Birlik narx musbat bo‘lishi kerak.",
    ),
});

const orderFormSchema = z.object({
  clientId: z.string().min(1, "Client tanlanishi shart."),
  deadline: z.string().optional(),
  note: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Kamida bitta mahsulot qo‘shing."),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface OrderCreateDrawerProps {
  open: boolean;
  clients: Client[];
  variants: ProductVariantReference[];
  isSubmitting: boolean;
  isOptionsLoading: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateSalesOrderPayload) => Promise<void>;
}

export function OrderCreateDrawer({
  open,
  clients,
  variants,
  isSubmitting,
  isOptionsLoading,
  errorMessage,
  onOpenChange,
  onSubmit,
}: OrderCreateDrawerProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      clientId: "",
      deadline: "",
      note: "",
      items: [{ productVariantId: "", quantity: 1, unitPrice: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });
  const watchedItems = watch("items");

  useEffect(() => {
    if (open) {
      reset({
        clientId: "",
        deadline: "",
        note: "",
        items: [{ productVariantId: "", quantity: 1, unitPrice: "" }],
      });
    }
  }, [open, reset]);

  const variantOptions = useMemo(
    () =>
      variants.map((variant) => ({
        id: variant.id,
        label: [
          variant.product.name,
          variant.color.name,
          variant.material.name,
          variant.season.name,
        ].join(" · "),
      })),
    [variants],
  );

  const estimatedTotal = watchedItems.reduce((total, item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      return total;
    }

    return total + quantity * unitPrice;
  }, 0);

  const hasProvidedPrices = watchedItems.some(
    (item) => Number(item.unitPrice) > 0,
  );
  const formDisabled = isSubmitting || isOptionsLoading;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Buyurtma yaratish"
      description="Buyurtma CONFIRMED status bilan yaratiladi. Jami summa backend tomonidan saqlanadi."
      className="max-w-4xl"
    >
      <form
        className="space-y-5"
        onSubmit={handleSubmit((values) => onSubmit(buildPayload(values)))}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            htmlFor="orderClient"
            label="Client"
            error={errors.clientId?.message}
            required
          >
            <Select
              id="orderClient"
              disabled={formDisabled}
              aria-invalid={Boolean(errors.clientId)}
              {...register("clientId")}
            >
              <option value="">Client tanlang</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField htmlFor="orderDeadline" label="Muddat">
            <Input
              id="orderDeadline"
              type="date"
              disabled={formDisabled}
              {...register("deadline")}
            />
          </FormField>
        </div>

        <section className="space-y-3 rounded-xl border bg-muted/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Mahsulotlar</p>
              <p className="text-xs text-muted-foreground">
                Narx kiritilmasa, backend aktiv ProductPrice’dan oladi.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={formDisabled}
              onClick={() =>
                append({ productVariantId: "", quantity: 1, unitPrice: "" })
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
                className="grid gap-3 rounded-lg border bg-card/60 p-3 md:grid-cols-[1fr_120px_160px_auto]"
              >
                <FormField
                  htmlFor={`orderItemVariant-${field.id}`}
                  label="Mahsulot varianti"
                  error={errors.items?.[index]?.productVariantId?.message}
                  required
                >
                  <Select
                    id={`orderItemVariant-${field.id}`}
                    disabled={formDisabled}
                    aria-invalid={Boolean(errors.items?.[index]?.productVariantId)}
                    {...register(`items.${index}.productVariantId`)}
                  >
                    <option value="">Variant tanlang</option>
                    {variantOptions.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.label}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  htmlFor={`orderItemQuantity-${field.id}`}
                  label="Miqdor"
                  error={errors.items?.[index]?.quantity?.message}
                  required
                >
                  <Input
                    id={`orderItemQuantity-${field.id}`}
                    type="number"
                    min={1}
                    step={1}
                    disabled={formDisabled}
                    aria-invalid={Boolean(errors.items?.[index]?.quantity)}
                    {...register(`items.${index}.quantity`)}
                  />
                </FormField>

                <FormField
                  htmlFor={`orderItemPrice-${field.id}`}
                  label="Birlik narx"
                  error={errors.items?.[index]?.unitPrice?.message}
                >
                  <Input
                    id={`orderItemPrice-${field.id}`}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Backend narxi"
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
                    aria-label="Mahsulot qatorini o‘chirish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {typeof errors.items?.message === "string" ? (
            <p role="alert" className="text-xs text-rose-500">
              {errors.items.message}
            </p>
          ) : null}
        </section>

        <FormField htmlFor="orderNote" label="Izoh">
          <Textarea
            id="orderNote"
            placeholder="Ixtiyoriy izoh"
            disabled={formDisabled}
            {...register("note")}
          />
        </FormField>

        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          <p className="font-medium">Taxminiy summa</p>
          <p className="text-muted-foreground">
            {hasProvidedPrices
              ? `${estimatedTotal.toLocaleString("uz-UZ")} so‘m · faqat kiritilgan narxlar bo‘yicha. Yakuniy summa backend tomonidan qaytariladi.`
              : "Narx kiritilmagan qatorlar backenddagi aktiv narx bilan hisoblanadi."}
          </p>
        </div>

        {clients.length === 0 ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Avval client yarating. Buyurtma active clientga bog‘lanadi.
          </p>
        ) : null}

        {variants.length === 0 ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Avval product variant yarating. Buyurtma mahsulot variantiga bog‘lanadi.
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
          disabled={formDisabled || clients.length === 0 || variants.length === 0}
        >
          {isSubmitting ? "Buyurtma yaratilmoqda..." : "Buyurtma yaratish"}
        </Button>
      </form>
    </Drawer>
  );
}

function buildPayload(values: OrderFormValues): CreateSalesOrderPayload {
  return {
    clientId: values.clientId,
    deadline: normalizeOptional(values.deadline),
    note: normalizeOptional(values.note),
    items: values.items.map((item) => ({
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      unitPrice: normalizeOptional(item.unitPrice),
    })),
  };
}

function normalizeOptional(value?: string): string | null {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}
