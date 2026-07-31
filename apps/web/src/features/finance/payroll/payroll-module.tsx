"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/layout/page-section";
import { StatusBadge } from "@/components/data-display/status-badge";
import { employeesApi } from "@/lib/api/employees";
import { financeApi, type PayPayrollPeriodPayload } from "@/lib/api/finance";
import { queryKeys } from "@/lib/api/query-keys";
import { labelStatus, payrollPeriodStatusLabel } from "@/lib/status-labels";
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
  const [isCalculateConfirmOpen, setIsCalculateConfirmOpen] = useState(false);
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
  const canCalculate = Boolean(selectedPeriod && ["DRAFT", "CALCULATED"].includes(selectedPeriod.status));
  const canPay = Boolean(selectedPeriod && ["CALCULATED", "PARTIALLY_PAID"].includes(selectedPeriod.status) && items.some((item) => Number(item.remainingAmount) > 0));
  const canClose = Boolean(selectedPeriod && ["CALCULATED", "PAID"].includes(selectedPeriod.status));

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
      setFeedback("Ish haqi davri yaratildi.");
      setActionError(null);
      await invalidatePayroll();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const calculateMutation = useMutation({
    mutationFn: financeApi.calculatePayrollPeriod,
    onSuccess: async (response) => {
      setSelectedPeriodId(response.data.id);
      setFeedback("Ish haqi tizim tomonidan hisoblandi.");
      setActionError(null);
      await invalidatePayroll();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const closeMutation = useMutation({
    mutationFn: financeApi.closePayrollPeriod,
    onSuccess: async (response) => {
      setSelectedPeriodId(response.data.id);
      setFeedback("Ish haqi davri yopildi.");
      setActionError(null);
      await invalidatePayroll();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const payMutation = useMutation({
    mutationFn: (payload: PayPayrollPeriodPayload) => {
      if (!selectedPeriod?.id) {
        throw new Error("Ish haqi davri tanlanmagan.");
      }

      return financeApi.payPayrollPeriod(selectedPeriod.id, payload);
    },
    onSuccess: async () => {
      setIsPaymentOpen(false);
      setFeedback("Ish haqi to‘lovi yozildi.");
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
      throw new Error("Tuzatish turi tanlanmagan.");
    },
    onSuccess: async () => {
      setAdjustmentKind(null);
      setFeedback("Tuzatish qo‘shildi.");
      setActionError(null);
      await invalidatePayroll();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  if (periodsQuery.isPending) {
    return <LoadingState label="Ish haqi davrlari yuklanmoqda..." />;
  }

  if (periodsQuery.isError) {
    return (
      <ErrorState
        title="Ish haqi davrlari yuklanmadi"
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Ish haqi davrlari</h2>
            <p className="mt-1 text-sm text-muted-foreground">Davrni tanlang va shu davr bo‘yicha keyingi ishni bajaring.</p>
          </div>
          <Button type="button" className="shrink-0" onClick={() => { createPeriodMutation.reset(); setActionError(null); setIsCreatePeriodOpen(true); }}>
            Yangi davr
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

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Tanlangan davr"
            value={selectedPeriod ? formatMonth(selectedPeriod.month) : "—"}
            description={`${periods.length} ta saqlangan davr`}
            accent="neutral"
          />
          <KpiCard
            label="Yakuniy oylik"
            value={`${selectedPeriod?.totalFinalAmount ?? "0"} so‘m`}
            description="Tizim hisoblagan jami summa"
            accent="success"
          />
          <KpiCard
            label="Qoldiq"
            value={`${selectedPeriod?.totalRemainingAmount ?? "0"} so‘m`}
            description="To‘lanmagan summa"
            accent="warning"
          />
        </div>
      </PageSection>

      <PageSection
        title="Davrlar tarixi"
        description="Boshqa davrni ko‘rish uchun qatorni tanlang. Tarix joriy ish maydonidan alohida saqlanadi."
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
            ? `${formatMonth(selectedPeriod.month)} — ish haqi tafsilotlari`
            : "Ish haqi tafsilotlari"
        }
        description="Barcha qiymatlar tizimdan olinadi; ekran hisob-kitob qilmaydi."
      >
        {selectedPeriod ? <div className="mb-5 rounded-xl border border-border/70 bg-card/50 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold">{formatMonth(selectedPeriod.month)}</p>
                <StatusBadge tone={selectedPeriod.status === "CLOSED" || selectedPeriod.status === "PAID" ? "success" : selectedPeriod.status === "PARTIALLY_PAID" ? "warning" : selectedPeriod.status === "CALCULATED" ? "info" : "neutral"}>
                  {labelStatus(payrollPeriodStatusLabel, selectedPeriod.status)}
                </StatusBadge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{getNextStep(selectedPeriod.status, selectedPeriod.totalRemainingAmount)}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {canCalculate ? <Button type="button" disabled={calculateMutation.isPending} onClick={() => { calculateMutation.reset(); setActionError(null); setIsCalculateConfirmOpen(true); }}>{selectedPeriod.status === "CALCULATED" ? "Qayta hisoblash" : "Ish haqini hisoblash"}</Button> : null}
              {canPay ? <Button type="button" onClick={() => { payMutation.reset(); setActionError(null); setIsPaymentOpen(true); }}>Xodimga to‘lov</Button> : null}
              {canClose ? <Button type="button" variant="outline" disabled={closeMutation.isPending} onClick={() => { closeMutation.reset(); setActionError(null); setIsCloseConfirmOpen(true); }}>Davrni yopish</Button> : null}
            </div>
          </div>
        </div>
        : null}

        {itemsQuery.isPending && selectedPeriod ? (
          <LoadingState label="Ish haqi tafsilotlari yuklanmoqda..." />
        ) : itemsQuery.isError ? (
          <ErrorState
            title="Ish haqi tafsilotlari yuklanmadi"
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

      <PageSection title="Keyingi hisob uchun tuzatishlar" description="Avans, bonus va jarima tanlangan davrga qo‘lda bog‘lanmaydi. Tizim ularni kiritilgan sana bo‘yicha mos ish haqi hisobiga qo‘shadi.">
        <div className="grid gap-3 sm:grid-cols-3">
          {(["advance", "bonus", "penalty"] as const).map((kind) => (
            <button key={kind} type="button" className="min-h-12 rounded-xl border border-border/70 bg-card/40 px-4 py-3 text-left transition hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => { adjustmentMutation.reset(); setActionError(null); setAdjustmentKind(kind); }}>
              <span className="block font-semibold">{kind === "advance" ? "Avans" : kind === "bonus" ? "Bonus" : "Jarima"} qo‘shish</span>
              <span className="mt-1 block text-sm text-muted-foreground">Xodim uchun yangi yozuv</span>
            </button>
          ))}
        </div>
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
        periodLabel={selectedPeriod ? formatMonth(selectedPeriod.month) : ""}
        items={items}
        isSubmitting={payMutation.isPending}
        errorMessage={payMutation.isError ? actionError : null}
        onOpenChange={setIsPaymentOpen}
        onSubmit={async (payload) => {
          await payMutation.mutateAsync(payload);
        }}
      />

      <ConfirmDialog
        open={isCalculateConfirmOpen}
        isPending={calculateMutation.isPending}
        errorMessage={calculateMutation.isError ? actionError : null}
        onOpenChange={setIsCalculateConfirmOpen}
        title={selectedPeriod?.status === "CALCULATED" ? "Ish haqini qayta hisoblash" : "Ish haqini hisoblash"}
        description={selectedPeriod ? `${formatMonth(selectedPeriod.month)} davri hisoblanadi.${selectedPeriod.status === "CALCULATED" ? " Hozirgi xodimlar kesimidagi hisob natijalari yangidan tuziladi." : ""}` : "Davr tanlanmagan."}
        confirmLabel={selectedPeriod?.status === "CALCULATED" ? "Qayta hisoblash" : "Hisoblash"}
        onConfirm={async () => { if (selectedPeriod) await calculateMutation.mutateAsync(selectedPeriod.id); }}
      />

      <ConfirmDialog
        open={isCloseConfirmOpen}
        isPending={closeMutation.isPending}
        errorMessage={closeMutation.isError ? actionError : null}
        onOpenChange={setIsCloseConfirmOpen}
        title="Ish haqi davrini yopish"
        description={selectedPeriod ? `${formatMonth(selectedPeriod.month)} davri yopiladi. Qoldiq: ${selectedPeriod.totalRemainingAmount} so‘m. Yopilgandan keyin qayta hisoblash va to‘lov kiritish bloklanadi.` : "Davr tanlanmagan."}
        confirmLabel="Yopish"
        destructive
        onConfirm={async () => {
          if (selectedPeriod) {
            await closeMutation.mutateAsync(selectedPeriod.id);
          }
        }}
      />
    </div>
  );
}

function getNextStep(status: string, remainingAmount: string): string {
  if (status === "DRAFT") return "Keyingi qadam: xodimlar ish haqini hisoblash.";
  if (status === "CALCULATED") return Number(remainingAmount) > 0 ? "Natijani tekshiring va xodimlar to‘lovini kiriting yoki davrni yopish qarorini tasdiqlang." : "Natijani tekshiring va davrni yoping.";
  if (status === "PARTIALLY_PAID") return "Keyingi qadam: qolgan xodimlar to‘lovini davom ettirish.";
  if (status === "PAID") return "Barcha to‘lovlar kiritilgan. Davrni yopish mumkin.";
  return "Bu davr yopilgan va faqat ko‘rish uchun mavjud.";
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
