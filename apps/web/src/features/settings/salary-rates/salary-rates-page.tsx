"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { Drawer } from "@/components/overlays/drawer";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { productApi } from "@/lib/api/product";
import { queryKeys } from "@/lib/api/query-keys";
import {
  settingsApi,
  type SalaryRate,
  type SalaryRatePayload,
} from "@/lib/api/settings";

const salaryRateFormSchema = z
  .object({
    stageId: z.string().min(1, "Bosqich tanlanishi kerak."),
    productVariantId: z.string().optional(),
    amount: z
      .string()
      .transform((value) => value.trim())
      .refine((value) => Number(value) > 0, "Stavka musbat bo‘lishi kerak."),
    effectiveFrom: z.string().min(1, "Boshlanish sanasi kiritilishi shart."),
    effectiveTo: z.string().optional(),
  })
  .refine(
    (values) =>
      !values.effectiveTo ||
      new Date(values.effectiveTo) > new Date(values.effectiveFrom),
    {
      path: ["effectiveTo"],
      message: "Tugash sanasi boshlanish sanasidan keyin bo‘lishi kerak.",
    },
  );

type SalaryRateFormValues = z.infer<typeof salaryRateFormSchema>;

export function SalaryRatesPage() {
  const queryClient = useQueryClient();
  const salaryRatesQuery = useQuery({
    queryKey: queryKeys.settings.salaryRates(),
    queryFn: settingsApi.getSalaryRates,
  });
  const stagesQuery = useQuery({
    queryKey: queryKeys.product.stages(),
    queryFn: productApi.getStages,
  });
  const productsQuery = useQuery({
    queryKey: queryKeys.product.products(),
    queryFn: productApi.getProducts,
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [rateToArchive, setRateToArchive] = useState<SalaryRate | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const createMutation = useMutation({
    mutationFn: settingsApi.createSalaryRate,
    onSuccess: () => invalidateSalaryRateQueries(queryClient),
  });
  const archiveMutation = useMutation({
    mutationFn: settingsApi.archiveSalaryRate,
    onSuccess: () => invalidateSalaryRateQueries(queryClient),
  });

  const salaryRates = salaryRatesQuery.data?.data ?? [];
  const stages = stagesQuery.data?.data ?? [];
  const productVariantOptions =
    productsQuery.data?.data.flatMap((product) =>
      product.variants.map((variant) => ({
        id: variant.id,
        label: `${variant.product.name} · ${variant.color.name} · ${variant.material.name} · ${variant.season.name}`,
      })),
    ) ?? [];
  const isLoading =
    salaryRatesQuery.isPending || stagesQuery.isPending || productsQuery.isPending;
  const firstError =
    salaryRatesQuery.error ?? stagesQuery.error ?? productsQuery.error;

  return (
    <div>
      <PageHeader
        title="Ish haqi stavkalari"
        description="Bosqich va product variant bo‘yicha ishbay stavkalarni boshqarish"
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {feedback ? (
          <p
            role="status"
            className={`rounded-lg border px-3 py-2 text-sm ${
              feedback.tone === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            {feedback.message}
          </p>
        ) : (
          <span />
        )}
        <Button
          onClick={() => {
            setFeedback(null);
            setIsCreateOpen(true);
          }}
        >
          Stavka qo‘shish
        </Button>
      </div>

      {isLoading ? <LoadingState label="Ishbay stavkalar yuklanmoqda..." /> : null}

      {firstError ? (
        <ErrorState
          title="Ishbay stavkalar yuklanmadi"
          description={
            firstError instanceof Error
              ? firstError.message
              : "Ma’lumotlarni olishda xatolik yuz berdi."
          }
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void salaryRatesQuery.refetch();
                void stagesQuery.refetch();
                void productsQuery.refetch();
              }}
            >
              Qayta urinish
            </Button>
          }
        />
      ) : null}

      {!isLoading && !firstError && salaryRates.length === 0 ? (
        <EmptyState
          title="Ishbay stavkalar mavjud emas"
          description="Stavka yaratilgach, xodim ishiga shu stavka qo‘llanadi."
        />
      ) : null}

      {!isLoading && !firstError && salaryRates.length > 0 ? (
        <DataTable label="Ishbay stavkalar jadvali">
          <DataTableHead>
            <DataTableRow>
              <DataTableHeader>Bosqich</DataTableHeader>
              <DataTableHeader>Qo‘llanish turi</DataTableHeader>
              <DataTableHeader>Mahsulot varianti</DataTableHeader>
              <DataTableHeader>Stavka</DataTableHeader>
              <DataTableHeader>Amal qilish davri</DataTableHeader>
              <DataTableHeader>Amallar</DataTableHeader>
            </DataTableRow>
          </DataTableHead>
          <tbody>
            {salaryRates.length > 0 ? (
              salaryRates.map((rate) => (
                <DataTableRow key={rate.id}>
                  <DataTableCell className="font-semibold">
                    {rate.stage.name}
                  </DataTableCell>
                  <DataTableCell>
                    {rate.productVariant ? "Alohida mahsulot" : "Butun bosqich"}
                  </DataTableCell>
                  <DataTableCell>
                    {rate.productVariant
                      ? `${rate.productVariant.product.name} · ${rate.productVariant.color.name} · ${rate.productVariant.material.name} · ${rate.productVariant.season.name}`
                      : "Barcha mahsulot variantlari"}
                  </DataTableCell>
                  <DataTableCell>{formatAmount(rate.amount)} so‘m / dona</DataTableCell>
                  <DataTableCell>
                    {formatDateTime(rate.effectiveFrom)} →{" "}
                    {rate.effectiveTo ? formatDateTime(rate.effectiveTo) : "Ochiq"}
                  </DataTableCell>
                  <DataTableCell>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                      disabled={archiveMutation.isPending}
                      onClick={() => {
                        setFeedback(null);
                        setRateToArchive(rate);
                      }}
                    >
                      Arxivlash
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))
            ) : (
              <EmptyTableState
                colSpan={6}
                title="Stavkalar mavjud emas"
                description="Yangi stavka qo‘shing."
              />
            )}
          </tbody>
        </DataTable>
      ) : null}

      <SalaryRateFormDrawer
        open={isCreateOpen}
        stages={stages}
        productVariantOptions={productVariantOptions}
        isSubmitting={createMutation.isPending}
        errorMessage={
          createMutation.error instanceof Error ? createMutation.error.message : null
        }
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) createMutation.reset();
        }}
        onSubmit={async (values) => {
          setFeedback(null);
          await createMutation.mutateAsync(buildSalaryRatePayload(values));
          setFeedback({ tone: "success", message: "Ishbay stavka yaratildi." });
          setIsCreateOpen(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(rateToArchive)}
        onOpenChange={(open) => {
          if (!open) setRateToArchive(null);
        }}
        title="Stavkani arxivlash"
        description="Stavka o‘chirilmaydi, faqat faol ro‘yxatdan chiqadi. Oldingi ishlar o‘zgarmaydi."
        confirmLabel={archiveMutation.isPending ? "Bajarilmoqda..." : "Arxivlash"}
        destructive
        onConfirm={() => {
          if (!rateToArchive) return;
          archiveMutation.mutate(rateToArchive.id, {
            onSuccess: () => {
              setFeedback({
                tone: "success",
                message: "Ishbay stavka arxivlandi.",
              });
              setRateToArchive(null);
            },
            onError: (error) => {
              setFeedback({
                tone: "error",
                message:
                  error instanceof Error
                    ? error.message
                    : "Arxivlashda xatolik yuz berdi.",
              });
            },
          });
        }}
      />
    </div>
  );
}

function SalaryRateFormDrawer({
  open,
  stages,
  productVariantOptions,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  stages: Array<{ id: string; name: string; sortOrder: number }>;
  productVariantOptions: Array<{ id: string; label: string }>;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SalaryRateFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SalaryRateFormValues>({
    resolver: zodResolver(salaryRateFormSchema),
    defaultValues: {
      stageId: "",
      productVariantId: "",
      amount: "",
      effectiveFrom: "",
      effectiveTo: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        stageId: "",
        productVariantId: "",
        amount: "",
        effectiveFrom: "",
        effectiveTo: "",
      });
    }
  }, [open, reset]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Yangi ishbay stavka"
      description="V1: stage-level yoki product-specific stavka. Employee-specific stavka keyingi ehtiyoj bo‘lsa qo‘shiladi."
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormField
          htmlFor="salaryRateStageId"
          label="Bosqich"
          error={errors.stageId?.message}
          required
        >
          <Select
            id="salaryRateStageId"
            defaultValue=""
            disabled={isSubmitting || stages.length === 0}
            aria-invalid={Boolean(errors.stageId)}
            {...register("stageId")}
          >
            <option value="" disabled>
              Tanlang
            </option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.sortOrder}. {stage.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField htmlFor="salaryRateProductVariantId" label="Mahsulot varianti">
          <Select
            id="salaryRateProductVariantId"
            defaultValue=""
            disabled={isSubmitting}
            {...register("productVariantId")}
          >
            <option value="">Barcha product variantlar</option>
            {productVariantOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          htmlFor="salaryRateAmount"
          label="Stavka"
          error={errors.amount?.message}
          required
        >
          <Input
            id="salaryRateAmount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Masalan: 120"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.amount)}
            {...register("amount")}
          />
        </FormField>

        <FormField
          htmlFor="salaryRateEffectiveFrom"
          label="Boshlanish vaqti"
          error={errors.effectiveFrom?.message}
          required
        >
          <Input
            id="salaryRateEffectiveFrom"
            type="datetime-local"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.effectiveFrom)}
            {...register("effectiveFrom")}
          />
        </FormField>

        <FormField
          htmlFor="salaryRateEffectiveTo"
          label="Tugash vaqti"
          error={errors.effectiveTo?.message}
        >
          <Input
            id="salaryRateEffectiveTo"
            type="datetime-local"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.effectiveTo)}
            {...register("effectiveTo")}
          />
        </FormField>

        {stages.length === 0 ? (
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Stavka yaratish uchun avval ishlab chiqarish bosqichlari sozlanishi
            kerak.
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saqlanmoqda..." : "Stavka yaratish"}
        </Button>
      </form>
    </Drawer>
  );
}

function buildSalaryRatePayload(
  values: SalaryRateFormValues,
): SalaryRatePayload {
  return {
    stageId: values.stageId,
    productVariantId: values.productVariantId || null,
    amount: values.amount,
    effectiveFrom: toIsoString(values.effectiveFrom),
    effectiveTo: values.effectiveTo ? toIsoString(values.effectiveTo) : null,
  };
}

function toIsoString(value: string): string {
  return new Date(value).toISOString();
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAmount(value: string): string {
  return new Intl.NumberFormat("uz-UZ").format(Number(value));
}

async function invalidateSalaryRateQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.salaryRates() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.overview() }),
  ]);
}
