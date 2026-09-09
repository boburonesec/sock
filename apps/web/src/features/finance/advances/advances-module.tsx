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
import { employeesApi } from "@/lib/api/employees";
import { financeApi, type Advance } from "@/lib/api/finance";
import { queryKeys } from "@/lib/api/query-keys";
import { AdvancesTable } from "./components/advances-table";
import { useAdvances } from "./use-advances";
import { useAuthStore } from "@/stores/auth-store";

export function AdvancesModule() {
  const permissions = useAuthStore((state) => state.permissions);
  const isOwner = useAuthStore((state) => state.roles.includes("Owner"));
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? null);
  const canApprove = permissions.includes("expense.approve");
  const canPay = permissions.includes("expense.pay");
  const queryClient = useQueryClient();
  const { data, error, isError, isPending, refetch } = useAdvances();
  // `silentForbidden`: not every finance.write role also has employees.view
  // (e.g. Accountant). A missing employee list should only disable the
  // "who is this for" picker below, not trip the page-level forbidden banner.
  const employeesQuery = useQuery({
    queryKey: queryKeys.employees.list(),
    queryFn: employeesApi.getEmployeesSilentlyForbidden,
    retry: false,
  });
  const canPickEmployee = !employeesQuery.isError;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ employeeId: "", amount: "", reason: "" });
  const [actionError, setActionError] = useState<string | null>(null);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.advances() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.summary() }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      financeApi.createAdvance({
        employeeId: form.employeeId,
        amount: form.amount,
        reason: form.reason,
      }),
    onSuccess: async () => {
      setDrawerOpen(false);
      setForm({ employeeId: "", amount: "", reason: "" });
      setActionError(null);
      await invalidate();
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : "Avans so‘rovi ochilmadi.");
    },
  });

  async function runAction(advance: Advance, action: "approve" | "reject" | "pay") {
    setBusyId(advance.id);
    setActionError(null);
    try {
      if (action === "approve") await financeApi.approveAdvance(advance.id);
      if (action === "reject") await financeApi.rejectAdvance(advance.id);
      if (action === "pay") await financeApi.payAdvance(advance.id);
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
    return <LoadingState label="Avanslar yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Avanslar yuklanmadi"
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

  const advances = data?.data ?? [];
  const employees = (employeesQuery.data?.data ?? []).filter(
    (employee) => employee.status === "ACTIVE",
  );
  const pending = advances.filter((item) => item.status === "REQUESTED" || item.status === "APPROVED")
    .length;

  return (
    <div className="space-y-8">
      <PageSection>
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard
            label="Avans yozuvlari"
            value={`${advances.length} ta`}
            description="barcha holatlar"
            accent="primary"
          />
          <KpiCard
            label="Jarayonda"
            value={`${pending} ta`}
            description="so‘ralgan yoki tasdiqlangan"
            accent="warning"
          />
        </div>
      </PageSection>

      <PageSection
        title="Avans so‘rovlari"
        description="So‘rov → menejer tasdiqlaydi → buxgalter to‘laydi. Ish haqiga faqat tasdiqlangan/to‘langan avanslar kiradi."
      >
        <div className="mb-4 flex flex-col items-end gap-1.5">
          <Button
            type="button"
            onClick={() => setDrawerOpen(true)}
            disabled={!canPickEmployee}
          >
            Avans so‘rovi
          </Button>
          {!canPickEmployee ? (
            <p className="text-right text-xs text-muted-foreground">
              Xodimlar ro‘yxatini ko‘rish uchun ruxsatingiz yo‘q — yangi avans
              so‘rovini shu yerdan ochib bo‘lmaydi. Kerak bo‘lsa korxona
              egasidan ruxsat so‘rang.
            </p>
          ) : null}
        </div>
        {actionError ? (
          <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {actionError}
          </p>
        ) : null}
        <AdvancesTable
          advances={advances}
          busyId={busyId}
          currentUserId={currentUserId}
          canApprove={canApprove}
          canPay={canPay}
          allowRequesterBypass={isOwner}
          onApprove={(advance) => runAction(advance, "approve")}
          onReject={(advance) => runAction(advance, "reject")}
          onPay={(advance) => runAction(advance, "pay")}
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
        title="Yangi avans so‘rovi"
        description="So‘rov ochiladi; to‘lov alohida amal."
      >
        <form className="space-y-4" onSubmit={submitCreate}>
          <FormField htmlFor="advance-employee" label="Xodim" required>
            <select
              id="advance-employee"
              className="flex h-11 w-full rounded-lg border bg-background px-3 text-sm"
              value={form.employeeId}
              onChange={(event) => setForm({ ...form, employeeId: event.target.value })}
              required
            >
              <option value="">Tanlang</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField htmlFor="advance-amount" label="Summa" required>
            <Input
              id="advance-amount"
              inputMode="decimal"
              placeholder="Masalan: 50000"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              required
            />
          </FormField>
          <FormField htmlFor="advance-reason" label="Sabab" required>
            <Textarea
              id="advance-reason"
              placeholder="Qisqa izoh"
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
              required
            />
          </FormField>
          <Button
            className="w-full"
            type="submit"
            disabled={
              !form.employeeId ||
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
