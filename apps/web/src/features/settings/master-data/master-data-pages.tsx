"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { Drawer } from "@/components/overlays/drawer";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  productApi,
  type MasterDataItem,
  type MasterDataItemPayload,
  type ProductionStage,
  type ProductionStagePayload,
} from "@/lib/api/product";
import { queryKeys } from "@/lib/api/query-keys";
import type { ApiCollection } from "@/lib/api/types";

type MasterDataRecord = MasterDataItem | ProductionStage;
type FormMode = "create" | "edit";

interface MasterDataListPageProps<T extends MasterDataRecord> {
  title: string;
  description: string;
  emptyDescription: string;
  queryKey: QueryKey;
  queryFn: () => Promise<ApiCollection<T>>;
  createFn: (payload: never) => Promise<{ data: T }>;
  updateFn: (id: string, payload: never) => Promise<{ data: T }>;
  archiveFn: (id: string) => Promise<{ data: T }>;
  variant: "catalog" | "stages";
}

const catalogFormSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Nomi kiritilishi shart.")),
  code: z
    .string()
    .transform((value) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : "";
    })
    .optional(),
});

const stageFormSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Nomi kiritilishi shart.")),
  sortOrder: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value === "" || Number.isInteger(Number(value)), {
      message: "Tartib raqami butun son bo‘lishi kerak.",
    })
    .refine((value) => value === "" || Number(value) >= 1, {
      message: "Tartib raqami 1 dan katta bo‘lishi kerak.",
    }),
});

interface MasterDataFormValues {
  name: string;
  code?: string;
  sortOrder?: string;
}

function MasterDataListPage<T extends MasterDataRecord>({
  title,
  description,
  emptyDescription,
  queryKey,
  queryFn,
  createFn,
  updateFn,
  archiveFn,
  variant,
}: MasterDataListPageProps<T>) {
  const queryClient = useQueryClient();
  const { data, error, isError, isPending, refetch } = useQuery({
    queryKey,
    queryFn,
  });
  const [formState, setFormState] = useState<{
    mode: FormMode;
    record: T | null;
  } | null>(null);
  const [recordToArchive, setRecordToArchive] = useState<T | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: never }) =>
      updateFn(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  const archiveMutation = useMutation({
    mutationFn: archiveFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const records = data?.data ?? [];
  const formError =
    createMutation.error instanceof Error
      ? createMutation.error.message
      : updateMutation.error instanceof Error
        ? updateMutation.error.message
        : null;

  async function submitForm(values: MasterDataFormValues): Promise<void> {
    setFeedback(null);
    const payload = buildPayload(values, variant);

    if (formState?.mode === "edit" && formState.record) {
      await updateMutation.mutateAsync({
        id: formState.record.id,
        payload: payload as never,
      });
      setFeedback({ tone: "success", message: `${title} yozuvi yangilandi.` });
    } else {
      await createMutation.mutateAsync(payload as never);
      setFeedback({ tone: "success", message: `${title} yozuvi yaratildi.` });
    }

    setFormState(null);
  }

  return (
    <div>
      <PageHeader title={title} description={description} />

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
            setFormState({ mode: "create", record: null });
          }}
        >
          Yangi yozuv qo‘shish
        </Button>
      </div>

      {isPending ? <LoadingState label={`${title} yuklanmoqda...`} /> : null}

      {isError ? (
        <ErrorState
          title={`${title} yuklanmadi`}
          description={
            error instanceof Error
              ? error.message
              : "Ma’lumotlarni olishda xatolik yuz berdi."
          }
          action={
            <Button type="button" variant="outline" onClick={() => refetch()}>
              Qayta urinish
            </Button>
          }
        />
      ) : null}

      {!isPending && !isError && records.length === 0 ? (
        <EmptyState title={`${title} mavjud emas`} description={emptyDescription} />
      ) : null}

      {!isPending && !isError && records.length > 0 ? (
        <DataTable label={`${title} jadvali`}>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeader>Nomi</DataTableHeader>
              <DataTableHeader>
                {variant === "stages" ? "Tartib raqami" : "Kod"}
              </DataTableHeader>
              <DataTableHeader>Amallar</DataTableHeader>
            </DataTableRow>
          </DataTableHead>
          <tbody>
            {records.map((record) => (
              <DataTableRow key={record.id}>
                <DataTableCell className="font-semibold">{record.name}</DataTableCell>
                <DataTableCell>
                  {variant === "stages"
                    ? (record as ProductionStage).sortOrder
                    : (record as MasterDataItem).code ?? "—"}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9"
                      onClick={() => {
                        setFeedback(null);
                        setFormState({ mode: "edit", record });
                      }}
                    >
                      Tahrirlash
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                      disabled={archiveMutation.isPending}
                      onClick={() => {
                        setFeedback(null);
                        setRecordToArchive(record);
                      }}
                    >
                      Arxivlash
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
          </tbody>
        </DataTable>
      ) : null}

      <MasterDataFormDrawer
        open={Boolean(formState)}
        title={title}
        variant={variant}
        mode={formState?.mode ?? "create"}
        record={formState?.record ?? null}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        errorMessage={formError}
        onOpenChange={(open) => {
          if (!open) setFormState(null);
        }}
        onSubmit={submitForm}
      />

      <ConfirmDialog
        open={Boolean(recordToArchive)}
        onOpenChange={(open) => {
          if (!open) setRecordToArchive(null);
        }}
        title="Yozuvni arxivlash"
        description={
          recordToArchive
            ? `${recordToArchive.name} arxivlanadi. Yozuv o‘chirilmaydi, faqat faol ro‘yxatdan chiqadi.`
            : "Yozuv arxivlanadi."
        }
        confirmLabel={archiveMutation.isPending ? "Bajarilmoqda..." : "Arxivlash"}
        destructive
        onConfirm={() => {
          if (!recordToArchive) return;
          const recordName = recordToArchive.name;
          archiveMutation.mutate(recordToArchive.id, {
            onSuccess: () => {
              setFeedback({ tone: "success", message: `${recordName} arxivlandi.` });
              setRecordToArchive(null);
            },
            onError: (mutationError) => {
              setFeedback({
                tone: "error",
                message:
                  mutationError instanceof Error
                    ? mutationError.message
                    : "Arxivlashda xatolik yuz berdi.",
              });
            },
          });
        }}
      />
    </div>
  );
}

function MasterDataFormDrawer({
  open,
  title,
  variant,
  mode,
  record,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  variant: "catalog" | "stages";
  mode: FormMode;
  record: MasterDataRecord | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MasterDataFormValues) => Promise<void>;
}) {
  const schema = variant === "stages" ? stageFormSchema : catalogFormSchema;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MasterDataFormValues>({
    resolver: zodResolver(schema) as Resolver<MasterDataFormValues>,
    defaultValues: {
      name: "",
      code: "",
      sortOrder: "",
    },
  });

  useEffect(() => {
    reset({
      name: mode === "edit" ? record?.name ?? "" : "",
      code:
        mode === "edit" && variant === "catalog"
          ? (record as MasterDataItem | null)?.code ?? ""
          : "",
      sortOrder:
        mode === "edit" && variant === "stages" && record
          ? String((record as ProductionStage).sortOrder)
          : "",
    });
  }, [mode, open, record, reset, variant]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? `${title}: yangi yozuv` : `${title}: tahrirlash`}
      description="Asosiy ma’lumotlar yozuvi tizim orqali saqlanadi."
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormField htmlFor="masterDataName" label="Nomi" error={errors.name?.message} required>
          <Input
            id="masterDataName"
            autoComplete="off"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </FormField>

        {variant === "catalog" ? (
          <FormField htmlFor="masterDataCode" label="Kod">
            <Input
              id="masterDataCode"
              autoComplete="off"
              disabled={isSubmitting}
              placeholder="Ixtiyoriy"
              {...register("code")}
            />
          </FormField>
        ) : (
          <FormField
            htmlFor="stageSortOrder"
            label="Tartib raqami"
            error={errors.sortOrder?.message}
          >
            <Input
              id="stageSortOrder"
              type="number"
              min="1"
              disabled={isSubmitting}
              placeholder="Bo‘sh qolsa, tizim keyingi raqamni beradi"
              aria-invalid={Boolean(errors.sortOrder)}
              {...register("sortOrder")}
            />
          </FormField>
        )}

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            {errorMessage}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? "Saqlanmoqda..."
            : mode === "create"
              ? "Yaratish"
              : "Saqlash"}
        </Button>
      </form>
    </Drawer>
  );
}

function buildPayload(
  values: MasterDataFormValues,
  variant: "catalog" | "stages",
): MasterDataItemPayload | ProductionStagePayload {
  if (variant === "stages") {
    return {
      name: values.name,
      ...(values.sortOrder ? { sortOrder: Number(values.sortOrder) } : {}),
    };
  }

  return {
    name: values.name,
    code: values.code ? values.code : null,
  };
}

const catalogCreateFns = {
  colors: productApi.createColor,
  materials: productApi.createMaterial,
  seasons: productApi.createSeason,
};

const catalogUpdateFns = {
  colors: productApi.updateColor,
  materials: productApi.updateMaterial,
  seasons: productApi.updateSeason,
};

const catalogArchiveFns = {
  colors: productApi.archiveColor,
  materials: productApi.archiveMaterial,
  seasons: productApi.archiveSeason,
};

function castCatalogCreate(
  fn: (payload: MasterDataItemPayload) => Promise<{ data: MasterDataItem }>,
) {
  return fn as (payload: never) => Promise<{ data: MasterDataItem }>;
}

function castCatalogUpdate(
  fn: (id: string, payload: MasterDataItemPayload) => Promise<{ data: MasterDataItem }>,
) {
  return fn as (id: string, payload: never) => Promise<{ data: MasterDataItem }>;
}

function castStageCreate(
  fn: (payload: ProductionStagePayload) => Promise<{ data: ProductionStage }>,
) {
  return fn as (payload: never) => Promise<{ data: ProductionStage }>;
}

function castStageUpdate(
  fn: (id: string, payload: ProductionStagePayload) => Promise<{ data: ProductionStage }>,
) {
  return fn as (id: string, payload: never) => Promise<{ data: ProductionStage }>;
}

export function ColorsMasterDataPage() {
  return (
    <MasterDataListPage
      title="Ranglar"
      description="Mahsulot ranglari katalogi"
      emptyDescription="Hozircha faol ranglar mavjud emas."
      queryKey={queryKeys.product.colors()}
      queryFn={productApi.getColors}
      createFn={castCatalogCreate(catalogCreateFns.colors)}
      updateFn={castCatalogUpdate(catalogUpdateFns.colors)}
      archiveFn={catalogArchiveFns.colors}
      variant="catalog"
    />
  );
}

export function MaterialsMasterDataPage() {
  return (
    <MasterDataListPage
      title="Materiallar"
      description="Mahsulot tarkibida ishlatiladigan materiallar"
      emptyDescription="Hozircha faol materiallar mavjud emas."
      queryKey={queryKeys.product.materials()}
      queryFn={productApi.getMaterials}
      createFn={castCatalogCreate(catalogCreateFns.materials)}
      updateFn={castCatalogUpdate(catalogUpdateFns.materials)}
      archiveFn={catalogArchiveFns.materials}
      variant="catalog"
    />
  );
}

export function SeasonsMasterDataPage() {
  return (
    <MasterDataListPage
      title="Mavsumlar"
      description="Mahsulot mavsumlari katalogi"
      emptyDescription="Hozircha faol mavsumlar mavjud emas."
      queryKey={queryKeys.product.seasons()}
      queryFn={productApi.getSeasons}
      createFn={castCatalogCreate(catalogCreateFns.seasons)}
      updateFn={castCatalogUpdate(catalogUpdateFns.seasons)}
      archiveFn={catalogArchiveFns.seasons}
      variant="catalog"
    />
  );
}

export function StagesMasterDataPage() {
  return (
    <MasterDataListPage
      title="Ishlab chiqarish bosqichlari"
      description="Fabrika ishlab chiqarish oqimining sozlangan bosqichlari"
      emptyDescription="Hozircha faol ishlab chiqarish bosqichlari mavjud emas."
      queryKey={queryKeys.product.stages()}
      queryFn={productApi.getStages}
      createFn={castStageCreate(productApi.createStage)}
      updateFn={castStageUpdate(productApi.updateStage)}
      archiveFn={productApi.archiveStage}
      variant="stages"
    />
  );
}
