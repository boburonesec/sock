"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { Button } from "@/components/ui/button";
import { productApi } from "@/lib/api/product";
import { queryKeys } from "@/lib/api/query-keys";
import {
  supplierApi,
  type CreateSupplierPaymentPayload,
  type CreateSupplierPurchasePayload,
  type Supplier,
  type SupplierDebt,
  type SupplierPayload,
} from "@/lib/api/supplier";
import { SupplierDetailsDrawer } from "./components/supplier-details-drawer";
import { SupplierFormDrawer } from "./components/supplier-form-drawer";
import { SupplierPaymentDrawer } from "./components/supplier-payment-drawer";
import { SupplierPurchaseDrawer } from "./components/supplier-purchase-drawer";
import { SuppliersTable } from "./components/suppliers-table";
import { useSupplierFinanceData } from "./use-supplier-finance-data";

type SupplierFormState =
  | { mode: "create"; supplier: null }
  | { mode: "edit"; supplier: Supplier };

export function SuppliersModule() {
  const queryClient = useQueryClient();
  const [selectedDebt, setSelectedDebt] = useState<SupplierDebt | null>(null);
  const [formState, setFormState] = useState<SupplierFormState | null>(null);
  const [supplierToArchive, setSupplierToArchive] = useState<Supplier | null>(
    null,
  );
  const [purchaseInitialSupplierId, setPurchaseInitialSupplierId] = useState<
    string | null
  >(null);
  const [paymentInitialSupplierId, setPaymentInitialSupplierId] = useState<
    string | null
  >(null);
  const [isPurchaseDrawerOpen, setIsPurchaseDrawerOpen] = useState(false);
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const { suppliersQuery, debtsQuery, purchasesQuery, paymentsQuery } =
    useSupplierFinanceData();
  const materialsQuery = useQuery({
    queryKey: queryKeys.product.materials(),
    queryFn: productApi.getMaterials,
  });

  const createSupplier = useMutation({
    mutationFn: supplierApi.createSupplier,
    onSuccess: () => invalidateSupplierQueries(queryClient),
  });
  const updateSupplier = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SupplierPayload }) =>
      supplierApi.updateSupplier(id, payload),
    onSuccess: () => invalidateSupplierQueries(queryClient),
  });
  const archiveSupplier = useMutation({
    mutationFn: supplierApi.archiveSupplier,
    onSuccess: () => invalidateSupplierQueries(queryClient),
  });
  const createPurchase = useMutation({
    mutationFn: supplierApi.createPurchase,
    onSuccess: () => invalidateSupplierQueries(queryClient),
  });
  const createPayment = useMutation({
    mutationFn: supplierApi.createPayment,
    onSuccess: () => invalidateSupplierQueries(queryClient),
  });

  const isPending =
    suppliersQuery.isPending ||
    debtsQuery.isPending ||
    purchasesQuery.isPending ||
    paymentsQuery.isPending ||
    materialsQuery.isPending;
  const isError =
    suppliersQuery.isError ||
    debtsQuery.isError ||
    purchasesQuery.isError ||
    paymentsQuery.isError ||
    materialsQuery.isError;
  const error =
    suppliersQuery.error ??
    debtsQuery.error ??
    purchasesQuery.error ??
    paymentsQuery.error ??
    materialsQuery.error;

  if (isPending) {
    return <LoadingState label="Yetkazib beruvchi ma’lumotlari yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Yetkazib beruvchi ma’lumotlari yuklanmadi"
        description={
          error instanceof Error
            ? error.message
            : "Ma’lumotlarni olishda xatolik yuz berdi."
        }
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              suppliersQuery.refetch();
              debtsQuery.refetch();
              purchasesQuery.refetch();
              paymentsQuery.refetch();
              materialsQuery.refetch();
            }}
          >
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const suppliers = suppliersQuery.data?.data ?? [];
  const debts = debtsQuery.data?.data ?? [];
  const purchases = purchasesQuery.data?.data ?? [];
  const payments = paymentsQuery.data?.data ?? [];
  const materials = materialsQuery.data?.data ?? [];
  const formError =
    createSupplier.error instanceof Error
      ? createSupplier.error.message
      : updateSupplier.error instanceof Error
        ? updateSupplier.error.message
        : null;
  const purchaseError =
    createPurchase.error instanceof Error ? createPurchase.error.message : null;
  const paymentError =
    createPayment.error instanceof Error ? createPayment.error.message : null;

  return (
    <div className="space-y-8">
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
      ) : null}

      <PageSection>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Yetkazib beruvchilar"
            value={`${suppliers.length} ta`}
            description="tizim qaytargan yetkazib beruvchi yozuvlari"
            accent="primary"
          />
          <KpiCard
            label="Yetkazib beruvchi qarzi"
            value={`${debts.length} ta`}
            description="Tizim hisoblagan qarz yozuvlari"
            accent="warning"
          />
          <KpiCard
            label="Xarid yozuvlari"
            value={`${purchases.length} ta`}
            description="tizim qaytargan xarid yozuvlari"
            accent="neutral"
          />
          <KpiCard
            label="To‘lov yozuvlari"
            value={`${payments.length} ta`}
            description="tizim qaytargan to‘lov yozuvlari"
            accent="success"
          />
        </div>
      </PageSection>

      <PageSection
        title="Yetkazib beruvchi qarzdorligi"
        description="Qarz qiymatlari tizim hisob-kitob orqali qaytariladi."
      >
        <div className="mb-4 flex justify-end">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              onClick={() => {
                setFeedback(null);
                createSupplier.reset();
                updateSupplier.reset();
                setFormState({ mode: "create", supplier: null });
              }}
            >
              Yetkazib beruvchi qo‘shish
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFeedback(null);
                createPurchase.reset();
                setPurchaseInitialSupplierId(null);
                setIsPurchaseDrawerOpen(true);
              }}
            >
              Xarid qayd qilish
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFeedback(null);
                createPayment.reset();
                setPaymentInitialSupplierId(null);
                setIsPaymentDrawerOpen(true);
              }}
            >
              To‘lov qayd qilish
            </Button>
          </div>
        </div>
        <SuppliersTable debts={debts} onSelect={setSelectedDebt} />
      </PageSection>

      <SupplierDetailsDrawer
        debt={selectedDebt}
        purchases={purchases}
        payments={payments}
        isArchiving={archiveSupplier.isPending}
        onOpenChange={(open) => {
          if (!open) setSelectedDebt(null);
        }}
        onCreatePurchase={(supplierId) => {
          setFeedback(null);
          createPurchase.reset();
          setPurchaseInitialSupplierId(supplierId);
          setIsPurchaseDrawerOpen(true);
        }}
        onCreatePayment={(supplierId) => {
          setFeedback(null);
          createPayment.reset();
          setPaymentInitialSupplierId(supplierId);
          setIsPaymentDrawerOpen(true);
        }}
        onEdit={(supplier) => {
          setFeedback(null);
          createSupplier.reset();
          updateSupplier.reset();
          setFormState({ mode: "edit", supplier });
        }}
        onArchive={(supplier) => {
          setFeedback(null);
          setSupplierToArchive(supplier);
        }}
      />

      <SupplierFormDrawer
        open={Boolean(formState)}
        mode={formState?.mode ?? "create"}
        supplier={formState?.supplier ?? null}
        isSubmitting={createSupplier.isPending || updateSupplier.isPending}
        errorMessage={formError}
        onOpenChange={(open) => {
          if (!open) setFormState(null);
        }}
        onSubmit={async (payload: SupplierPayload) => {
          setFeedback(null);

          if (formState?.mode === "edit") {
            await updateSupplier.mutateAsync({
              id: formState.supplier.id,
              payload,
            });
            setFeedback({
              tone: "success",
              message: "Yetkazib beruvchi ma’lumotlari yangilandi.",
            });
          } else {
            await createSupplier.mutateAsync(payload);
            setFeedback({
              tone: "success",
              message: "Yangi yetkazib beruvchi yaratildi.",
            });
          }

          setFormState(null);
          setSelectedDebt(null);
        }}
      />

      <SupplierPurchaseDrawer
        open={isPurchaseDrawerOpen}
        suppliers={suppliers}
        materials={materials}
        initialSupplierId={purchaseInitialSupplierId}
        isSubmitting={createPurchase.isPending}
        isOptionsLoading={materialsQuery.isPending}
        errorMessage={purchaseError}
        onOpenChange={(open) => setIsPurchaseDrawerOpen(open)}
        onSubmit={async (payload: CreateSupplierPurchasePayload) => {
          setFeedback(null);
          await createPurchase.mutateAsync(payload);
          setFeedback({
            tone: "success",
            message: "Yetkazib beruvchi xaridi qayd qilindi.",
          });
          setIsPurchaseDrawerOpen(false);
          setSelectedDebt(null);
        }}
      />

      <SupplierPaymentDrawer
        open={isPaymentDrawerOpen}
        suppliers={suppliers}
        purchases={purchases}
        initialSupplierId={paymentInitialSupplierId}
        isSubmitting={createPayment.isPending}
        isOptionsLoading={false}
        errorMessage={paymentError}
        onOpenChange={(open) => setIsPaymentDrawerOpen(open)}
        onSubmit={async (payload: CreateSupplierPaymentPayload) => {
          setFeedback(null);
          await createPayment.mutateAsync(payload);
          setFeedback({
            tone: "success",
            message: "Yetkazib beruvchi to‘lovi qayd qilindi va xaridlarga taqsimlandi.",
          });
          setIsPaymentDrawerOpen(false);
          setSelectedDebt(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(supplierToArchive)}
        onOpenChange={(open) => {
          if (!open) setSupplierToArchive(null);
        }}
        title="Yetkazib beruvchini arxivlash"
        description={
          supplierToArchive
            ? `${supplierToArchive.name} faol ro‘yxatdan chiqariladi. Xaridlar va to‘lovlar o‘chirilmaydi.`
            : "Yetkazib beruvchi arxivlanadi."
        }
        confirmLabel={
          archiveSupplier.isPending ? "Arxivlanmoqda..." : "Arxivlash"
        }
        destructive
        onConfirm={() => {
          if (!supplierToArchive) return;
          const supplierName = supplierToArchive.name;
          archiveSupplier.mutate(supplierToArchive.id, {
            onSuccess: () => {
              setFeedback({
                tone: "success",
                message: `${supplierName} arxivlandi.`,
              });
              setSelectedDebt(null);
              setSupplierToArchive(null);
            },
            onError: (mutationError) => {
              setFeedback({
                tone: "error",
                message:
                  mutationError instanceof Error
                    ? mutationError.message
                    : "Yetkazib beruvchini arxivlashda xatolik yuz berdi.",
              });
            },
          });
        }}
      />
    </div>
  );
}

async function invalidateSupplierQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.supplier.suppliers() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.supplier.purchases() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.supplier.payments() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.supplier.debts() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.summary() }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.executiveSummary(),
    }),
  ]);
}
