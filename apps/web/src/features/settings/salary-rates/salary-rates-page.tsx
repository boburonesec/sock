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

const salaryRateFormSchema = z.object({
  stageId: z.string().min(1, "Bosqich tanlanishi kerak."),
  amount: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => Number(value) > 0, "Stavka musbat bo‘lishi kerak."),
});

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
  // Ombor — ishbay bosqich emas, stavka tanlovida ko‘rsatilmaydi.
  const stages = (stagesQuery.data?.data ?? []).filter(
    (stage) => stage.name !== "Ombor",
  );
  const isLoading = salaryRatesQuery.isPending || stagesQuery.isPending;
  const firstError = salaryRatesQuery.error ?? stagesQuery.error;

  return (
    <div>
      <PageHeader
        title="Ishbay stavkalar"
        description="Har bir ishlab chiqarish bosqichi uchun 1 dona ish qancha to‘lanadi"
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

      {isLoading ? <LoadingState label="Stavkalar yuklanmoqda..." /> : null}

      {firstError ? (
        <ErrorState
          title="Stavkalar yuklanmadi"
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
              }}
            >
              Qayta urinish
            </Button>
          }
        />
      ) : null}

      {!isLoading && !firstError && salaryRates.length === 0 ? (
        <EmptyState
          title="Stavka yo‘q"
          description="Masalan: Averlog — 120 so‘m/dona. Keyin smena o‘tkazganda ishchiga shu stavka yoziladi."
        />
      ) : null}

      {!isLoading && !firstError && salaryRates.length > 0 ? (
        <DataTable label="Ishbay stavkalar">
          <DataTableHead>
            <DataTableRow>
              <DataTableHeader>Bosqich</DataTableHeader>
              <DataTableHeader>1 dona uchun</DataTableHeader>
              <DataTableHeader>Amallar</DataTableHeader>
            </DataTableRow>
          </DataTableHead>
          <tbody>
            {salaryRates.map((rate) => (
              <DataTableRow key={rate.id}>
                <DataTableCell className="font-semibold">
                  {rate.stage.name}
                </DataTableCell>
                <DataTableCell>{formatAmount(rate.amount)} so‘m</DataTableCell>
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
            ))}
          </tbody>
        </DataTable>
      ) : null}

      <SalaryRateFormDrawer
        open={isCreateOpen}
        stages={stages}
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
          const payload: SalaryRatePayload = {
            stageId: values.stageId,
            amount: values.amount,
          };
          await createMutation.mutateAsync(payload);
          setFeedback({ tone: "success", message: "Stavka saqlandi." });
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
                message: "Stavka arxivlandi.",
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
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  stages: Array<{ id: string; name: string; sortOrder: number }>;
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
      amount: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({ stageId: "", amount: "" });
    }
  }, [open, reset]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Yangi ishbay stavka"
      description="Faqat bosqich va 1 dona narxi. Masalan: Dazmol — 80 so‘m."
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

        <FormField
          htmlFor="salaryRateAmount"
          label="1 dona uchun to‘lov (so‘m)"
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

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            {errorMessage}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saqlanmoqda..." : "Stavkani saqlash"}
        </Button>
      </form>
    </Drawer>
  );
}

function formatAmount(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return amount.toLocaleString("uz-UZ");
}

function invalidateSalaryRateQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.salaryRates() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.overview() }),
  ]);
}
