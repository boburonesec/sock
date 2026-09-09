"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, UseFormRegister, FieldErrors, Control, UseFormSetValue } from "react-hook-form";
import { z } from "zod";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ProductVariantReference } from "@/lib/api/types";
import type { Client, CreateSalesOrderPayload, SalesOrder } from "@/lib/api/sales";
import { useQuery } from "@tanstack/react-query";
import { productApi } from "@/lib/api/product";

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
  clientId: z.string().min(1, "Mijoz tanlanishi shart."),
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
  order?: SalesOrder | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateSalesOrderPayload) => Promise<void>;
}

function getActivePriceAmount(prices: any[]): string | null {
  if (!prices || prices.length === 0) return null;
  const now = new Date();
  const valid = prices.filter(p => new Date(p.effectiveFrom) <= now && (!p.effectiveTo || new Date(p.effectiveTo) > now));
  valid.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
  return valid[0]?.amount || null;
}

function OrderItemRow({
  index,
  fieldId,
  control,
  register,
  errors,
  formDisabled,
  variantOptions,
  remove,
  canRemove,
  variantId,
  setValue,
  isEdit,
}: {
  index: number;
  fieldId: string;
  control: Control<OrderFormValues>;
  register: UseFormRegister<OrderFormValues>;
  errors: FieldErrors<OrderFormValues>;
  formDisabled: boolean;
  variantOptions: { id: string; label: string }[];
  remove: (index: number) => void;
  canRemove: boolean;
  variantId: string;
  setValue: UseFormSetValue<OrderFormValues>;
  isEdit: boolean;
}) {
  const { data: activePriceData, isFetching } = useQuery({
    queryKey: ["activeVariantPrice", variantId],
    queryFn: () => productApi.getActiveVariantPrice(variantId).then((res) => res.data),
    enabled: Boolean(variantId),
    staleTime: 5 * 60 * 1000,
  });

  // Track if this row was just changed by the user in this session
  const [userChangedVariant, setUserChangedVariant] = useState(false);

  useEffect(() => {
    if (activePriceData !== undefined && variantId) {
      const activePrice = activePriceData?.amount || null;
      // If there is an active price, set it. 
      // ONLY overwrite if it's a NEW row (userChangedVariant) OR we're not in edit mode
      // Wait, if we're in edit mode, but the user selects a DIFFERENT variant, we DO want to overwrite.
      // So if `userChangedVariant` is true, we always overwrite.
      // If `isEdit` is false, we always overwrite (it's create mode).
      // If `isEdit` is true and `!userChangedVariant`, we keep the persisted price (do nothing).
      if (!isEdit || userChangedVariant) {
        if (activePrice) {
          setValue(`items.${index}.unitPrice`, activePrice, { shouldValidate: true });
        } else {
          setValue(`items.${index}.unitPrice`, "", { shouldValidate: true });
        }
      }
    }
  }, [activePriceData, variantId, index, setValue, isEdit, userChangedVariant]);

  const activePriceMissing = variantId && activePriceData !== undefined && !activePriceData?.amount;

  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-[1fr_auto]">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-[1fr_120px_160px]">
        <FormField
          htmlFor={`orderItemVariant-${fieldId}`}
          label="Mahsulot"
          error={errors.items?.[index]?.productVariantId?.message}
          required
        >
          <Select
            id={`orderItemVariant-${fieldId}`}
            disabled={formDisabled}
            aria-invalid={Boolean(errors.items?.[index]?.productVariantId)}
            {...register(`items.${index}.productVariantId`, {
              onChange: () => setUserChangedVariant(true)
            })}
          >
            <option value="">Mahsulotni tanlang</option>
            {variantOptions.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          htmlFor={`orderItemQuantity-${fieldId}`}
          label="Miqdor"
          error={errors.items?.[index]?.quantity?.message}
          required
        >
          <Input
            id={`orderItemQuantity-${fieldId}`}
            type="number"
            min={1}
            step={1}
            disabled={formDisabled}
            aria-invalid={Boolean(errors.items?.[index]?.quantity)}
            {...register(`items.${index}.quantity`)}
          />
        </FormField>

        <FormField
          htmlFor={`orderItemPrice-${fieldId}`}
          label="Birlik narx"
          error={
            activePriceMissing 
              ? "Aktiv narx topilmadi!" 
              : errors.items?.[index]?.unitPrice?.message
          }
        >
          <div className="relative">
            <Input
              id={`orderItemPrice-${fieldId}`}
              type="number"
              min={0}
              step="0.01"
              placeholder={isFetching ? "Yuklanmoqda..." : "Narx"}
              disabled={formDisabled || true} // Readonly for Seller normal flow
              readOnly
              aria-invalid={Boolean(errors.items?.[index]?.unitPrice) || Boolean(activePriceMissing)}
              className="bg-muted text-muted-foreground pr-10"
              {...register(`items.${index}.unitPrice`)}
            />
            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium">so‘m</span>
          </div>
        </FormField>
      </div>

      <div className="flex items-end max-md:justify-end">
        <Button
          type="button"
          variant="outline"
          className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 border-0 bg-transparent"
          disabled={formDisabled || !canRemove}
          onClick={() => remove(index)}
          aria-label="Mahsulotni o‘chirish"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export function OrderCreateDrawer({
  open,
  clients,
  variants,
  isSubmitting,
  isOptionsLoading,
  errorMessage,
  order = null,
  onOpenChange,
  onSubmit,
}: OrderCreateDrawerProps) {
  const isEdit = Boolean(order);
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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
    if (!open) return;

    if (order) {
      reset({
        clientId: order.client.id,
        deadline: order.deadline
          ? new Date(order.deadline).toISOString().slice(0, 10)
          : "",
        note: (order as any).notes ?? "",
        items: order.items.map((item) => ({
          productVariantId: item.productVariant.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
      return;
    }

    reset({
      clientId: "",
      deadline: "",
      note: "",
      items: [{ productVariantId: "", quantity: 1, unitPrice: "" }],
    });
  }, [open, order, reset]);

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
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || unitPrice <= 0) return total;
    return total + quantity * unitPrice;
  }, 0);

  const missingPrice = watchedItems.some((item) => item.productVariantId && !Number(item.unitPrice));
  const formDisabled = isSubmitting || isOptionsLoading;
  const disableSubmit = formDisabled || clients.length === 0 || variants.length === 0 || missingPrice;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Buyurtmani tahrirlash · ${order?.orderNumber ?? ""}` : "Buyurtma yaratish"}
      description={
        isEdit
          ? "Faqat yetkazilmagan buyurtma o‘zgartiriladi. Narxlar o‘zgartirilmasa oldingi holaticha saqlanadi."
          : "Buyurtma yaratiladi — bu mijozga yetkazilgan degani emas. Birlik narx tizim tomonidan olinadi."
      }
      // `Drawer`'s own default is `sm:max-w-lg`; tailwind-merge only drops a
      // conflicting class when the variant matches exactly, so an
      // unprefixed override here would sit alongside (not replace) that
      // default and lose to it above the `sm:` breakpoint. Match the prefix
      // so the wider modal actually applies at `sm:` and up.
      className="sm:max-w-4xl"
      footer={
        <Button
          form="order-create-form"
          type="submit"
          className="w-full"
          disabled={disableSubmit}
        >
          {isSubmitting
            ? (isEdit ? "Saqlanmoqda..." : "Buyurtma yaratilmoqda...")
            : (isEdit ? "O‘zgarishlarni saqlash" : "Buyurtma yaratish")}
        </Button>
      }
    >
      <form id="order-create-form" onSubmit={handleSubmit((values) => onSubmit(buildPayload(values)))} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <FormField htmlFor="orderClient" label="Mijoz" error={errors.clientId?.message} required>
            <Select id="orderClient" disabled={formDisabled} aria-invalid={Boolean(errors.clientId)} {...register("clientId")}>
              <option value="">Mijoz tanlang</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField htmlFor="orderDeadline" label="Muddat">
            <Input id="orderDeadline" type="date" disabled={formDisabled} {...register("deadline")} />
          </FormField>
        </div>

        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-lg">Mahsulotlar</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={formDisabled}
              onClick={() => append({ productVariantId: "", quantity: 1, unitPrice: "" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Mahsulot qo‘shish
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <OrderItemRow
                key={field.id}
                index={index}
                fieldId={field.id}
                control={control}
                register={register}
                errors={errors}
                formDisabled={formDisabled}
                variantOptions={variantOptions}
                remove={remove}
                canRemove={fields.length > 1}
                variantId={watchedItems[index]?.productVariantId}
                setValue={setValue}
                isEdit={isEdit}
              />
            ))}
          </div>

          {typeof errors.items?.message === "string" ? (
            <p role="alert" className="text-sm font-medium text-rose-500">
              {errors.items.message}
            </p>
          ) : null}
          
          {missingPrice ? (
            <p role="alert" className="text-sm font-medium text-rose-500">
              Diqqat: Ba&apos;zi mahsulotlarda aktiv narx yo‘q. Iltimos, narx belgilangan mahsulotlarni tanlang.
            </p>
          ) : null}
        </section>

        <FormField htmlFor="orderNote" label="Izoh">
          <Textarea id="orderNote" placeholder="Ixtiyoriy izoh" disabled={formDisabled} {...register("note")} />
        </FormField>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-medium text-primary">Jami summa</p>
            <p className="text-sm text-muted-foreground mt-1">
              Barcha qatorlar bo‘yicha hisoblangan yakuniy summa
            </p>
          </div>
          <p className="text-2xl font-bold text-primary text-right">
            {estimatedTotal.toLocaleString("uz-UZ")} so‘m
          </p>
        </div>

        {clients.length === 0 ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Avval mijoz yarating.
          </p>
        ) : null}
        {variants.length === 0 ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Avval mahsulot yarating.
          </p>
        ) : null}
        {errorMessage ? (
          <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {errorMessage}
          </p>
        ) : null}
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
