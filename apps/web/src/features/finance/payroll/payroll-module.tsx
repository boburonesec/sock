"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/layout/page-section";
import { employeesApi } from "@/lib/api/employees";
import { financeApi, type PayPayrollPeriodPayload } from "@/lib/api/finance";
import { queryKeys } from "@/lib/api/query-keys";
import {
  PayrollAdjustmentDrawer,
  type PayrollAdjustmentKind,
} from "./components/payroll-adjustment-drawer";
import { PayrollDetailsTable } from "./components/payroll-details-table";
import { PayrollPaymentDrawer } from "./components/payroll-payment-drawer";
import { PayrollPeriodDrawer } from "./components/payroll-period-drawer";
import { PayrollPeriodsTable } from "./components/payroll-periods-table";
import { usePayrollPeriodItems, usePayrollPeriods } from "./use-payroll";

export function PayrollModule() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState(false);
  const [adjustmentKind, setAdjustmentKind] =
    useState<PayrollAdjustmentKind | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const periodsQuery = usePayrollPeriods();
  const employeesQuery = useQuery({
    queryKey: queryKeys.employees.list(),
    queryFn: employeesApi.getEmployees,
  });
  const periods = periodsQuery.data?.data ?? [];
  const selectedPeriod =
    periods.find((period) => period.id === selectedPeriodId) ?? periods[0] ?? null;
  const itemsQuery = usePayrollPeriodItems(selectedPeriod?.id ?? null);
  const items = itemsQuery.data?.data ?? [];

  const invalidatePayroll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.payrollPeriods() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.summary() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.advances() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.executiveSummary() }),
      selectedPeriod?.id
        ? queryClient.invalidateQueries({
            queryKey: queryKeys.finance.payrollPeriodItems(selectedPeriod.id),
          })
        : Promise.resolve(),
    ]);
  };

  const createPeriodMutation = useMutation({
    mutationFn: financeApi.createPayrollPeriod,
    onSuccess: async (response) => {
      setSelectedPeriodId(response.data.id);
      setIsCreatePeriodOpen(false);
      setFeedback("Payroll period yaratildi.");
      setActionError(null);
      await invalidatePayroll();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const calculateMutation = useMutation({
    mutationFn: financeApi.calculatePayrollPeriod,
    onSuccess: async (response) => {
      setSelectedPeriodId(response.data.id);
      setFeedback("Payroll backend tomonidan hisoblandi.");
      setActionError(null);
      await invalidatePayroll();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const closeMutation = useMutation({
    mutationFn: financeApi.closePayrollPeriod,
    onSuccess: async (response) => {
      setSelectedPeriodId(response.data.id);
      setFeedback("Payroll period yopildi.");
      setActionError(null);
      await invalidatePayroll();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const payMutation = useMutation({
    mutationFn: (payload: PayPayrollPeriodPayload) => {
      if (!selectedPeriod?.id) {
        throw new Error("Payroll period tanlanmagan.");
      }

      return financeApi.payPayrollPeriod(selectedPeriod.id, payload);
    },
    onSuccess: async () => {
      setIsPaymentOpen(false);
      setFeedback("Payroll to‘lovi yozildi.");
      setActionError(null);
      await invalidatePayroll();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const adjustmentMutation = useMutation({
    mutationFn: (payload: {
      employeeId: string;
      amount: string;
      reason: string;
    }) => {
      if (adjustmentKind === "advance") return financeApi.createAdvance(payload);
      if (adjustmentKind === "bonus") return financeApi.createBonus(payload);
      if (adjustmentKind === "penalty") return financeApi.createPenalty(payload);
      throw new Error("Adjustment turi tanlanmagan.");
    },
    onSuccess: async () => {
      setAdjustmentKind(null);
      setFeedback("Payroll adjustment qo‘shildi.");
      setActionError(null);
      await invalidatePayroll();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  if (periodsQuery.isPending) {
    return <LoadingState label="Payroll davrlari yuklanmoqda..." />;
  }

  if (periodsQuery.isError) {
    return (
      <ErrorState
        title="Payroll davrlari yuklanmadi"
        description={
          periodsQuery.error instanceof Error
            ? periodsQuery.error.message
            : "Ma’lumotlarni olishda xatolik yuz berdi."
        }
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => periodsQuery.refetch()}
          >
            Qayta urinish
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageSection>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => setIsCreatePeriodOpen(true)}>
            Period yaratish
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setAdjustmentKind("advance")}
          >
            Avans qo‘shish
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setAdjustmentKind("bonus")}
          >
            Bonus qo‘shish
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setAdjustmentKind("penalty")}
          >
            Jarima qo‘shish
          </Button>
        </div>

        {feedback ? (
          <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {feedback}
          </p>
        ) : null}
        {actionError ? (
          <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {actionError}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Payroll davrlari"
            value={`${periods.length} ta`}
            description="API qaytargan payroll period yozuvlari"
            accent="primary"
          />
          <KpiCard
            label="Tanlangan status"
            value={selectedPeriod?.status ?? "—"}
            description="Backend payroll period holati"
            accent="neutral"
          />
          <KpiCard
            label="Yakuniy oylik"
            value={`${selectedPeriod?.totalFinalAmount ?? "0"} so‘m`}
            description="Backend hisoblangan snapshot"
            accent="success"
          />
          <KpiCard
            label="Qoldiq"
            value={`${selectedPeriod?.totalRemainingAmount ?? "0"} so‘m`}
            description="Backend payment snapshot"
            accent="warning"
          />
        </div>
      </PageSection>

      <PageSection
        title="Payroll davrlari"
        description="Davrni tanlab, xodimlar kesimidagi tafsilotlarni ko‘ring"
      >
        <PayrollPeriodsTable
          periods={periods}
          selectedPeriodId={selectedPeriod?.id ?? null}
          onSelect={setSelectedPeriodId}
        />
      </PageSection>

      <PageSection
        title={
          selectedPeriod
            ? `${formatMonth(selectedPeriod.month)} — payroll tafsilotlari`
            : "Payroll tafsilotlari"
        }
        description="Barcha qiymatlar backend payroll snapshotlaridan olinadi; frontend hisob-kitob qilmaydi."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={
              !selectedPeriod ||
              !["DRAFT", "CALCULATED"].includes(selectedPeriod.status) ||
              calculateMutation.isPending
            }
            onClick={() =>
              selectedPeriod && calculateMutation.mutate(selectedPeriod.id)
            }
          >
            {calculateMutation.isPending ? "Hisoblanmoqda..." : "Payroll hisoblash"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              !selectedPeriod ||
              !["CALCULATED", "PARTIALLY_PAID"].includes(selectedPeriod.status) ||
              items.length === 0
            }
            onClick={() => setIsPaymentOpen(true)}
          >
            To‘lov qilish
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              !selectedPeriod ||
              !["CALCULATED", "PAID"].includes(selectedPeriod.status) ||
              closeMutation.isPending
            }
            onClick={() => setIsCloseConfirmOpen(true)}
          >
            Periodni yopish
          </Button>
        </div>

        {itemsQuery.isPending && selectedPeriod ? (
          <LoadingState label="Payroll tafsilotlari yuklanmoqda..." />
        ) : itemsQuery.isError ? (
          <ErrorState
            title="Payroll tafsilotlari yuklanmadi"
            description={
              itemsQuery.error instanceof Error
                ? itemsQuery.error.message
                : "Ma’lumotlarni olishda xatolik yuz berdi."
            }
            action={
              <Button
                type="button"
                variant="outline"
                onClick={() => itemsQuery.refetch()}
              >
                Qayta urinish
              </Button>
            }
          />
        ) : (
          <PayrollDetailsTable details={items} />
        )}
      </PageSection>

      <PayrollPeriodDrawer
        open={isCreatePeriodOpen}
        isSubmitting={createPeriodMutation.isPending}
        errorMessage={createPeriodMutation.isError ? actionError : null}
        onOpenChange={setIsCreatePeriodOpen}
        onSubmit={async (payload) => {
          await createPeriodMutation.mutateAsync(payload);
        }}
      />

      <PayrollAdjustmentDrawer
        kind={adjustmentKind ?? "advance"}
        open={Boolean(adjustmentKind)}
        employees={employeesQuery.data?.data ?? []}
        isSubmitting={adjustmentMutation.isPending}
        errorMessage={adjustmentMutation.isError ? actionError : null}
        onOpenChange={(open) => {
          if (!open) setAdjustmentKind(null);
        }}
        onSubmit={async (payload) => {
          await adjustmentMutation.mutateAsync(payload);
        }}
      />

      <PayrollPaymentDrawer
        open={isPaymentOpen}
        items={items}
        isSubmitting={payMutation.isPending}
        errorMessage={payMutation.isError ? actionError : null}
        onOpenChange={setIsPaymentOpen}
        onSubmit={async (payload) => {
          await payMutation.mutateAsync(payload);
        }}
      />

      <ConfirmDialog
        open={isCloseConfirmOpen}
        onOpenChange={setIsCloseConfirmOpen}
        title="Payroll periodni yopish"
        description="Yopilgandan keyin bu period immutable bo‘ladi: qayta hisoblash va to‘lov kiritish bloklanadi."
        confirmLabel="Yopish"
        onConfirm={() => {
          if (selectedPeriod) closeMutation.mutate(selectedPeriod.id);
        }}
      />
    </div>
  );
}

function formatMonth(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Amalni bajarishda xatolik yuz berdi.";
}
