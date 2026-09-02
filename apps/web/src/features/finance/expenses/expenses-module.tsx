"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { financeApi, type Expense } from "@/lib/api/finance";
import { queryKeys } from "@/lib/api/query-keys";
import { settingsApi } from "@/lib/api/settings";
import { formatCurrency } from "@/lib/utils";
import { ExpensesTable } from "./components/expenses-table";
import { useExpenses } from "./use-expenses";
import { useAuthStore } from "@/stores/auth-store";

export function ExpensesModule() {
  const roles = useAuthStore((state) => state.roles);
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? null);
  const isOwner = roles.includes("Owner");
  const canApprove = isOwner || roles.includes("Manager");
  const canPay = isOwner || roles.includes("Accountant");
  const queryClient = useQueryClient();
  const { data, error, isError, isPending, refetch } = useExpenses();
  const categoriesQuery = useQuery({
    queryKey: queryKeys.settings.expenseCategories(),
    queryFn: settingsApi.getExpenseCategories,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ categoryId: "", amount: "", reason: "" });
  const [actionError, setActionError] = useState<string | null>(null);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.expenses() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.summary() }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      financeApi.createExpense({
        categoryId: form.categoryId,
        amount: form.amount,
        reason: form.reason,
      }),
    onSuccess: async () => {
      setDrawerOpen(false);
      setForm({ categoryId: "", amount: "", reason: "" });
      setActionError(null);
      await invalidate();
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : "Xarajat yaratilmadi.");
    },
  });

  async function runAction(expense: Expense, action: "approve" | "reject" | "pay" | "cancel") {
    setBusyId(expense.id);
    setActionError(null);
    try {
      if (action === "approve") await financeApi.approveExpense(expense.id);
      if (action === "reject") await financeApi.rejectExpense(expense.id);
      if (action === "pay") await financeApi.payExpense(expense.id);
      if (action === "cancel") await financeApi.cancelExpense(expense.id);
      await invalidate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Amal bajarilmadi.");
    } finally {
      setBusyId(null);
    }
  }

  function submitCreate(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate();
  }

  if (isPending) {
    return <LoadingState label="Xarajatlar yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Xarajatlar yuklanmadi"
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
    );
  }

  const expenses = data?.data ?? [];
  const categories = categoriesQuery.data?.data ?? [];
  const pendingCount = expenses.filter((item) => item.status === "REQUESTED").length;
  // Backend-aggregated Decimal sum (not a browser reduce over loaded rows —
  // see ExpensesCollectionResponse.totalPaidAmount).
  const paidSum = data?.totalPaidAmount ?? "0";

  return (
    <div className="space-y-8">
      <PageSection>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Xarajat yozuvlari"
            value={`${expenses.length} ta`}
            description="barcha holatlar"
            accent="primary"
          />
          <KpiCard
            label="Kutilayotgan"
            value={`${pendingCount} ta`}
            description="tasdiq kutmoqda"
            accent="warning"
          />
          <KpiCard
            label="To‘langan jami"
            value={formatCurrency(paidSum)}
            description="ro‘yxatdagi to‘langanlar"
            accent="success"
          />
        </div>
      </PageSection>

      <PageSection
        title="Xarajat so‘rovlari"
        description="So‘rov → tasdiq → to‘lov. Kategoriyalar korxona ochilganda avtomatik yaratiladi."
      >
        <div className="mb-4 flex justify-end">
          <Button type="button" onClick={() => setDrawerOpen(true)}>
            Xarajat yaratish
          </Button>
        </div>
        {actionError ? (
          <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {actionError}
          </p>
        ) : null}
        <ExpensesTable
          expenses={expenses}
          busyId={busyId}
          currentUserId={currentUserId}
          canApprove={canApprove}
          canPay={canPay}
          allowRequesterBypass={isOwner}
          onApprove={(expense) => runAction(expense, "approve")}
          onReject={(expense) => runAction(expense, "reject")}
          onPay={(expense) => runAction(expense, "pay")}
          onCancel={(expense) => runAction(expense, "cancel")}
        />
      </PageSection>

      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            createMutation.reset();
            setActionError(null);
          }
        }}
        title="Yangi xarajat"
        description="Xarajat so‘rovi REQUESTED holatida ochiladi."
      >
        <form className="space-y-4" onSubmit={submitCreate}>
          <FormField htmlFor="expense-category" label="Kategoriya" required>
            <select
              id="expense-category"
              className="flex h-11 w-full rounded-lg border bg-background px-3 text-sm"
              value={form.categoryId}
              onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
              required
            >
              <option value="">Tanlang</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField htmlFor="expense-amount" label="Summa" required>
            <Input
              id="expense-amount"
              inputMode="decimal"
              placeholder="Masalan: 150000"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              required
            />
          </FormField>
          <FormField htmlFor="expense-reason" label="Sabab" required>
            <Textarea
              id="expense-reason"
              placeholder="Qisqa izoh"
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
              required
            />
          </FormField>
          {categories.length === 0 ? (
            <p className="text-sm text-amber-200">
              Kategoriya yo‘q. Yangi korxonalarda avtomatik seed qilinadi; eski tenant uchun admin
              qayta ochishi yoki seed kerak.
            </p>
          ) : null}
          <Button
            className="w-full"
            type="submit"
            disabled={
              !form.categoryId ||
              !form.amount.trim() ||
              form.reason.trim().length < 3 ||
              createMutation.isPending
            }
          >
            {createMutation.isPending ? "Yaratilmoqda..." : "So‘rov ochish"}
          </Button>
        </form>
      </Drawer>
    </div>
  );
}
