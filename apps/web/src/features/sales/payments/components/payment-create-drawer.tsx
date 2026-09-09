"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Client, ClientDebt, ClientPayment, CreateClientPaymentPayload, SalesOrder } from "@/lib/api/sales";
import { useAuthStore } from "@/stores/auth-store";
import { formatCurrency } from "@/lib/utils";

const allocationSchema = z.object({
  orderId: z.string().min(1, "Buyurtma tanlanishi shart."),
  amount: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => Number(value) > 0, "To‘lovni taqsimlash summasi musbat bo‘lishi kerak."),
});

const paymentFormSchema = z
  .object({
    clientId: z.string().min(1, "Mijoz tanlanishi shart."),
    amount: z
      .string()
      .transform((value) => value.trim())
      .refine((value) => Number(value) > 0, "To‘lov summasi musbat bo‘lishi kerak."),
    method: z.enum(["CASH", "TRANSFER", "OTHER"], {
      message: "To‘lov usuli tanlanishi shart.",
    }),
    paymentDate: z.string().optional(),
    note: z.string().optional(),
    allocations: z.array(allocationSchema).min(1, "Kamida bitta taqsimot kerak."),
  })
  .refine(
    (values) => {
      const paymentAmount = Number(values.amount);
      const allocationTotal = values.allocations.reduce((total, allocation) => total + Number(allocation.amount), 0);
      return Math.abs(paymentAmount - allocationTotal) < 0.000001;
    },
    {
      message: "To‘lov taqsimoti jami to‘lov summasiga teng bo‘lishi kerak.",
      path: ["allocations"],
    },
  );

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const paymentStatusLabel: Record<string, string> = {
  UNPAID: "To‘lanmagan",
  PARTIALLY_PAID: "Qisman to‘langan",
  PAID: "To‘langan",
};

interface PaymentCreateDrawerProps {
  open: boolean;
  clients: Client[];
  debts: ClientDebt[];
  orders: SalesOrder[];
  isSubmitting: boolean;
  isOptionsLoading: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateClientPaymentPayload) => Promise<ClientPayment>;
}

export function PaymentCreateDrawer({
  open,
  clients,
  debts,
  orders,
  isSubmitting,
  isOptionsLoading,
  errorMessage,
  onOpenChange,
  onSubmit,
}: PaymentCreateDrawerProps) {
  const submissionRef = useRef(false);
  const activeFactoryId = useAuthStore((state) => state.activeFactoryId);
  const accessibleFactories = useAuthStore((state) => state.accessibleFactories);
  const activeFactoryName = accessibleFactories.find((factory) => factory.id === activeFactoryId)?.name ?? "Fabrika tanlanmagan";
  
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      clientId: "",
      amount: "",
      method: "CASH",
      paymentDate: new Date().toISOString().slice(0, 10),
      note: "",
      allocations: [{ orderId: "", amount: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "allocations",
  });
  const selectedClientId = watch("clientId");
  const watchedAllocations = watch("allocations");
  const amountRaw = watch("amount");
  const paymentAmount = Number(amountRaw);

  const submitPayment = handleSubmit(async (values) => {
    if (submissionRef.current) return;
    submissionRef.current = true;
    try {
      await onSubmit(buildPayload(values));
    } finally {
      submissionRef.current = false;
    }
  });

  useEffect(() => {
    if (open) {
      reset({
        clientId: "",
        amount: "",
        method: "CASH",
        paymentDate: new Date().toISOString().slice(0, 10),
        note: "",
        allocations: [{ orderId: "", amount: "" }],
      });
    }
  }, [open, reset]);

  // With exactly one allocation row, its amount must always equal the total
  // payment (the schema requires the allocations to sum to the payment
  // amount exactly), so retyping the same number into that single row is
  // pure duplicate entry. Keep it mirrored to the payment amount — still a
  // normal editable field, so a deliberate manual edit sticks until the
  // payment amount itself changes again or a second order is added, at
  // which point the split is the seller's to manage by hand as before.
  useEffect(() => {
    if (fields.length === 1) {
      setValue("allocations.0.amount", amountRaw, { shouldValidate: false });
    }
  }, [amountRaw, fields.length, setValue]);

  const clientOrders = useMemo(
    () => orders.filter((order) => order.client.id === selectedClientId && !["DRAFT", "CANCELLED"].includes(order.status)),
    [orders, selectedClientId],
  );
  
  const allocationTotal = watchedAllocations.reduce((total, allocation) => total + Number(allocation.amount || 0), 0);
  const unallocatedAmount = Number.isFinite(paymentAmount) ? paymentAmount - allocationTotal : 0;
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const selectedClientDebt = debts.find((debt) => debt.client.id === selectedClientId);
  const formDisabled = isSubmitting || isOptionsLoading;
  const disableSubmit = formDisabled || clients.length === 0 || orders.length === 0 || Math.abs(unallocatedAmount) > 0.000001;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="To‘lov qayd qilish"
      description="Mijoz to‘lovini qabul qilish va mavjud buyurtmalarga taqsimlash."
      // See order-create-drawer.tsx: an unprefixed override can't beat
      // Drawer's own `sm:max-w-lg` default in the compiled CSS, so this
      // never actually widened past 512px on desktop despite the intent.
      className="sm:max-w-4xl"
      footer={
        <Button
          form="payment-create-form"
          type="submit"
          className="w-full"
          disabled={disableSubmit}
        >
          {isSubmitting ? "To‘lov saqlanmoqda..." : "To‘lov qayd qilish"}
        </Button>
      }
    >
      <form id="payment-create-form" onSubmit={submitPayment} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <FormField htmlFor="paymentClient" label="Mijoz" error={errors.clientId?.message} required>
            <Select id="paymentClient" disabled={formDisabled} aria-invalid={Boolean(errors.clientId)} {...register("clientId")}>
              <option value="">Mijoz tanlang</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField htmlFor="paymentAmount" label="To‘lov summasi" error={errors.amount?.message} required>
            <div className="relative">
              <Input id="paymentAmount" type="number" min={0.01} step="0.01" disabled={formDisabled} aria-invalid={Boolean(errors.amount)} {...register("amount")} className="pr-12" />
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium">so‘m</span>
            </div>
          </FormField>

          <FormField htmlFor="paymentMethod" label="To‘lov usuli" error={errors.method?.message} required>
            <Select id="paymentMethod" disabled={formDisabled} aria-invalid={Boolean(errors.method)} {...register("method")}>
              <option value="CASH">Naqd</option>
              <option value="TRANSFER">O‘tkazma</option>
              <option value="OTHER">Boshqa</option>
            </Select>
          </FormField>

          <FormField htmlFor="paymentDate" label="To‘lov sanasi">
            <Input id="paymentDate" type="date" disabled={formDisabled} {...register("paymentDate")} />
          </FormField>
        </div>

        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-lg">Buyurtmalarga taqsimlash</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={formDisabled || !selectedClientId}
              onClick={() => append({ orderId: "", amount: "" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Buyurtma qo‘shish
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-[1fr_auto]">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-[1fr_180px]">
                  <FormField
                    htmlFor={`paymentAllocationOrder-${field.id}`}
                    label="Buyurtma"
                    error={errors.allocations?.[index]?.orderId?.message}
                    required
                  >
                    <Select
                      id={`paymentAllocationOrder-${field.id}`}
                      disabled={formDisabled || !selectedClientId}
                      aria-invalid={Boolean(errors.allocations?.[index]?.orderId)}
                      {...register(`allocations.${index}.orderId`)}
                    >
                      <option value="">Buyurtma tanlang</option>
                      {clientOrders.map((order) => (
                        <option key={order.id} value={order.id}>
                          {order.orderNumber} ({formatCurrency(order.totalAmount)}) — {paymentStatusLabel[order.paymentStatus] ?? order.paymentStatus}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField
                    htmlFor={`paymentAllocationAmount-${field.id}`}
                    label="Ajratiladigan summa"
                    error={errors.allocations?.[index]?.amount?.message}
                    required
                  >
                    <div className="relative">
                      <Input
                        id={`paymentAllocationAmount-${field.id}`}
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={formDisabled}
                        aria-invalid={Boolean(errors.allocations?.[index]?.amount)}
                        {...register(`allocations.${index}.amount`)}
                        className="pr-12"
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
                    disabled={formDisabled || fields.length === 1}
                    onClick={() => remove(index)}
                    aria-label="Taqsimot qatorini o‘chirish"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {typeof errors.allocations?.message === "string" ? (
            <p role="alert" className="text-sm font-medium text-rose-500">
              {errors.allocations.message}
            </p>
          ) : null}
        </section>

        <FormField htmlFor="paymentNote" label="Izoh">
          <Textarea id="paymentNote" placeholder="Ixtiyoriy izoh" disabled={formDisabled} {...register("note")} />
        </FormField>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="font-medium text-primary">To‘lov taqsimoti xulosasi</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Mijoz</p>
              <p className="font-medium">{selectedClient?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Joriy qarz</p>
              <p className="font-medium text-rose-600">{selectedClientDebt ? formatCurrency(selectedClientDebt.debt) : "0 so‘m"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Kiritilgan to‘lov</p>
              <p className="font-medium text-green-600">{Number.isFinite(paymentAmount) ? paymentAmount.toLocaleString("uz-UZ") : "0"} so‘m</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Taqsimlanmagan</p>
              <p className={`font-medium ${Math.abs(unallocatedAmount) > 0.000001 ? "text-amber-600" : "text-primary"}`}>
                {unallocatedAmount.toLocaleString("uz-UZ")} so‘m
              </p>
            </div>
          </div>
        </div>

        {selectedClientId && clientOrders.length === 0 ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Bu mijoz uchun taqsimlanadigan faol buyurtma topilmadi.
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

function buildPayload(values: PaymentFormValues): CreateClientPaymentPayload {
  return {
    clientId: values.clientId,
    amount: values.amount,
    method: values.method,
    paymentDate: normalizeOptional(values.paymentDate),
    note: normalizeOptional(values.note),
    allocations: values.allocations.map((allocation) => ({
      orderId: allocation.orderId,
      amount: allocation.amount,
    })),
  };
}

function normalizeOptional(value?: string): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
