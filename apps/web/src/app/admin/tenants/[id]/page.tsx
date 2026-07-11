"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlatformAdminGate } from "@/components/platform-admin/platform-admin-gate";
import { PlatformAdminShell } from "@/components/platform-admin/platform-admin-shell";
import { Drawer } from "@/components/overlays/drawer";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { platformAdminApi, type PlatformTenantUser } from "@/lib/api/platform-admin";

function formatTenantStatus(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Faol",
    SUSPENDED: "To‘xtatilgan",
    CANCELLED: "Bekor qilingan",
    PENDING: "Kutilmoqda",
  };

  return labels[status] ?? status;
}

function formatSubscriptionStatus(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Faol",
    TRIAL: "Sinov muddati",
    PAST_DUE: "To‘lov kutilmoqda",
    CANCELLED: "Bekor qilingan",
    NONE: "Belgilanmagan",
  };

  return labels[status] ?? status;
}

function formatBranchMode(mode: string): string {
  return mode === "MULTI" ? "Filialli korxona" : "Oddiy korxona";
}

function formatHealthMetricLabel(key: string): string {
  const labels: Record<string, string> = {
    factoryCount: "Filiallar",
    userCount: "Operatorlar",
    activeUserCount: "Faol operatorlar",
    activeEmployeeCount: "Faol ishbay xodimlar",
    employeeCount: "Ishbay xodimlar",
    productCount: "Mahsulotlar",
    orderCount: "Buyurtmalar",
    warehouseCount: "Omborlar",
    stockMovementCount: "Ombor harakatlari",
    payrollPeriodCount: "Ish haqi davrlari",
  };

  return labels[key] ?? key;
}

function formatUserRole(role: string): string {
  const labels: Record<string, string> = {
    Owner: "Korxona egasi",
    Manager: "Menejer",
    Accountant: "Buxgalter",
    Seller: "Sotuvchi",
    "Warehouse Operator": "Omborchi",
    "Shift Receiver": "Smena qabul qiluvchi",
  };

  return labels[role] ?? role;
}

export default function PlatformTenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params.id;
  const queryClient = useQueryClient();
  const tenantKey = ["platform-admin", "tenant", tenantId] as const;
  const healthKey = ["platform-admin", "tenant-health", tenantId] as const;
  const tenantsKey = ["platform-admin", "tenants"] as const;
  const [ownerDrawerOpen, setOwnerDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PlatformTenantUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<"activate" | "suspend" | null>(null);
  const [ownerForm, setOwnerForm] = useState({
    name: "",
    email: "",
    password: "ChangeMe123!",
  });
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ password: "" });
  const [branchModeForm, setBranchModeForm] = useState<"SINGLE" | "MULTI">("SINGLE");

  const tenantQuery = useQuery({
    queryKey: tenantKey,
    queryFn: () => platformAdminApi.getTenant(tenantId),
  });

  const healthQuery = useQuery({
    queryKey: healthKey,
    queryFn: () => platformAdminApi.getTenantHealth(tenantId),
  });

  const invalidateTenant = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: tenantKey }),
      queryClient.invalidateQueries({ queryKey: healthKey }),
      queryClient.invalidateQueries({ queryKey: tenantsKey }),
    ]);
  };

  const createOwner = useMutation({
    mutationFn: () =>
      platformAdminApi.createOwnerUser(tenantId, {
        name: ownerForm.name,
        email: ownerForm.email,
        password: ownerForm.password || undefined,
      }),
    onSuccess: async (response) => {
      await invalidateTenant();
      setGeneratedPassword(response.data.generatedPassword);
      setOwnerDrawerOpen(false);
      setOwnerForm({ name: "", email: "", password: "ChangeMe123!" });
    },
  });

  const updatePassword = useMutation({
    mutationFn: () => {
      if (!selectedUser) {
        throw new Error("Operator tanlanmagan.");
      }

      return platformAdminApi.updateTenantUserPassword(tenantId, selectedUser.id, {
        password: passwordForm.password,
      });
    },
    onSuccess: async () => {
      await invalidateTenant();
      setPasswordForm({ password: "" });
    },
  });

  const activateTenant = useMutation({
    mutationFn: () => platformAdminApi.activateTenant(tenantId),
    onSuccess: invalidateTenant,
  });

  const suspendTenant = useMutation({
    mutationFn: () => platformAdminApi.suspendTenant(tenantId),
    onSuccess: invalidateTenant,
  });

  const updateBranchMode = useMutation({
    mutationFn: () =>
      platformAdminApi.updateTenantBranchMode(tenantId, {
        branchMode: branchModeForm,
      }),
    onSuccess: invalidateTenant,
  });

  useEffect(() => {
    if (tenantQuery.data?.data.branchMode) {
      setBranchModeForm(tenantQuery.data.data.branchMode);
    }
  }, [tenantQuery.data?.data.branchMode]);

  function submitOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createOwner.mutate();
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updatePassword.mutate();
  }

  const tenant = tenantQuery.data?.data;
  const health = healthQuery.data?.data;
  const hasMainAccount = tenant?.users.some((user) => user.roles?.includes("Owner")) ?? false;

  return (
    <PlatformAdminGate>
      <PlatformAdminShell>
        <div className="mb-6">
          <Link href="/admin/tenants" className="text-sm text-muted-foreground hover:text-foreground">
            ← Korxonalar
          </Link>
        </div>

        {tenantQuery.isLoading && <LoadingState />}
        {tenantQuery.isError && (
          <ErrorState
            description="Korxona ma’lumotlari yuklanmadi."
            action={<Button onClick={() => tenantQuery.refetch()}>Qayta urinish</Button>}
          />
        )}

        {tenant && (
          <div className="space-y-6">
            <section className="panel p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{tenant.name}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tenant.contactName || "Kontakt yo‘q"} · {tenant.contactPhone || "Telefon yo‘q"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border px-3 py-1">{formatTenantStatus(tenant.status)}</span>
                    <span className="rounded-full border px-3 py-1">
                      Obuna: {formatSubscriptionStatus(tenant.subscriptionStatus)}
                    </span>
                    <span className="rounded-full border px-3 py-1">
                      Ishlash modeli: {formatBranchMode(tenant.branchMode)}
                    </span>
                    {tenant.planCode && (
                      <span className="rounded-full border px-3 py-1">Tarif: {tenant.planCode}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {!hasMainAccount ? (
                    <Button variant="outline" onClick={() => setOwnerDrawerOpen(true)}>
                      Korxona egasini ochish
                    </Button>
                  ) : null}
                  <Button onClick={() => setConfirmAction("activate")} disabled={tenant.status === "ACTIVE"}>
                    Faollashtirish
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmAction("suspend")} disabled={tenant.status === "SUSPENDED"}>
                    To‘xtatish
                  </Button>
                </div>
              </div>
            </section>

            {generatedPassword && (
              <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                <p className="font-semibold">Vaqtinchalik parol — faqat bir marta ko‘rsatiladi</p>
                <p className="mt-1 font-mono">{generatedPassword}</p>
              </section>
            )}

            <section className="panel p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="font-semibold">Ishlash modeli</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Oddiy korxonada filial sozlamalari ownerga ko‘rinmaydi. Filialli modelda filiallar va ularga ruxsatlar ochiladi.
                  </p>
                </div>
                <form
                  className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-80 sm:flex-row sm:items-end"
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateBranchMode.mutate();
                  }}
                >
                  <FormField htmlFor="tenant-branch-mode" label="Model">
                    <select
                      id="tenant-branch-mode"
                      className="flex h-11 w-full rounded-lg border bg-background px-3 text-sm"
                      value={branchModeForm}
                      onChange={(event) => setBranchModeForm(event.target.value as "SINGLE" | "MULTI")}
                    >
                      <option value="SINGLE">Oddiy korxona</option>
                      <option value="MULTI">Filialli korxona</option>
                    </select>
                  </FormField>
                  <Button
                    type="submit"
                    disabled={branchModeForm === tenant.branchMode || updateBranchMode.isPending}
                  >
                    {updateBranchMode.isPending ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                </form>
              </div>
              {updateBranchMode.isError ? (
                <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                  Model o‘zgarmadi. Filialli korxonani oddiy korxonaga qaytarish uchun bitta faol filial qolishi kerak.
                </p>
              ) : null}
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="panel p-5">
                <h2 className="font-semibold">Filiallar</h2>
                <div className="mt-4 space-y-3">
                  {tenant.factories.length === 0 && <p className="text-sm text-muted-foreground">Filial yo‘q.</p>}
                  {tenant.factories.map((factory) => (
                    <div key={factory.id} className="rounded-xl border p-3">
                      <p className="font-medium">{factory.name}</p>
                      {factory.location ? (
                        <p className="text-xs text-muted-foreground">{factory.location}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel p-5">
                <h2 className="font-semibold">Operatorlar</h2>
                <div className="mt-4 space-y-3">
                  {tenant.users.length === 0 && <p className="text-sm text-muted-foreground">Operator yo‘q.</p>}
                  {tenant.users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full rounded-xl border p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/30"
                      onClick={() => {
                        setSelectedUser(user);
                        setPasswordForm({ password: "" });
                        updatePassword.reset();
                      }}
                    >
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email} · {formatTenantStatus(user.status)}</p>
                      {user.roles?.length ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Rol: {user.roles.map(formatUserRole).join(", ")}
                        </p>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-semibold">Korxona holati</h2>
                {healthQuery.isFetching && <span className="text-xs text-muted-foreground">Yangilanmoqda...</span>}
              </div>
              {healthQuery.isLoading && <LoadingState className="min-h-24" />}
              {healthQuery.isError && <ErrorState description="Holat yuklanmadi." />}
              {health && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(health.metrics).map(([key, value]) => (
                    <div key={key} className="rounded-xl border p-3">
                      <p className="text-xs text-muted-foreground">{formatHealthMetricLabel(key)}</p>
                      <p className="mt-1 text-2xl font-bold">{value}</p>
                    </div>
                  ))}
                  <div className="rounded-xl border p-3 sm:col-span-2 lg:col-span-4">
                    <p className="text-xs text-muted-foreground">Eslatma</p>
                    <p className="mt-1 text-sm">{health.notes.join(" ")}</p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        <Drawer open={ownerDrawerOpen} onOpenChange={setOwnerDrawerOpen} title="Korxona egasini ochish">
          <form className="space-y-4" onSubmit={submitOwner}>
            <FormField htmlFor="owner-name" label="Ism" required>
              <Input id="owner-name" value={ownerForm.name} onChange={(event) => setOwnerForm({ ...ownerForm, name: event.target.value })} />
            </FormField>
            <FormField htmlFor="owner-email" label="Email" required>
              <Input id="owner-email" type="email" value={ownerForm.email} onChange={(event) => setOwnerForm({ ...ownerForm, email: event.target.value })} />
            </FormField>
            <FormField htmlFor="owner-password" label="Parol">
              <Input id="owner-password" type="text" value={ownerForm.password} onChange={(event) => setOwnerForm({ ...ownerForm, password: event.target.value })} />
            </FormField>
            <p className="text-xs text-muted-foreground">
              Korxona egasi dasturga kiradi va boshqa operatorlarni boshqaradi. Agar filial bo‘lmasa, tizim avtomatik Asosiy filial yaratadi.
            </p>
            {createOwner.isError && <p className="text-sm text-rose-300">Korxona egasi yaratilmadi.</p>}
            <Button className="w-full" disabled={!ownerForm.name.trim() || !ownerForm.email.trim() || createOwner.isPending}>
              {createOwner.isPending ? "Yaratilmoqda..." : "Korxona egasini ochish"}
            </Button>
          </form>
        </Drawer>

        <Drawer
          open={Boolean(selectedUser)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedUser(null);
              setPasswordForm({ password: "" });
              updatePassword.reset();
            }
          }}
          title={selectedUser?.name ?? "Operator"}
          description="Operator ma’lumotlari va parolini yangilash"
        >
          {selectedUser ? (
            <div className="space-y-5">
              <section className="rounded-xl border p-4 text-sm">
                <p className="font-medium">{selectedUser.name}</p>
                <p className="mt-1 text-muted-foreground">{selectedUser.email}</p>
                <p className="mt-1 text-muted-foreground">Holat: {formatTenantStatus(selectedUser.status)}</p>
                {selectedUser.roles?.length ? (
                  <p className="mt-1 text-muted-foreground">Rol: {selectedUser.roles.map(formatUserRole).join(", ")}</p>
                ) : null}
                {selectedUser.factories?.length ? (
                  <p className="mt-1 text-muted-foreground">Filial: {selectedUser.factories.join(", ")}</p>
                ) : null}
              </section>

              <form className="space-y-4" onSubmit={submitPassword}>
                <FormField htmlFor="tenant-user-password" label="Yangi parol" required>
                  <Input
                    id="tenant-user-password"
                    type="text"
                    minLength={8}
                    value={passwordForm.password}
                    onChange={(event) => setPasswordForm({ password: event.target.value })}
                  />
                </FormField>
                {updatePassword.isSuccess ? (
                  <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                    Parol yangilandi.
                  </p>
                ) : null}
                {updatePassword.isError ? (
                  <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                    Parol yangilanmadi. Ma’lumotlarni tekshiring.
                  </p>
                ) : null}
                <Button
                  className="w-full"
                  type="submit"
                  disabled={passwordForm.password.trim().length < 8 || updatePassword.isPending}
                >
                  {updatePassword.isPending ? "Yangilanmoqda..." : "Parolni yangilash"}
                </Button>
              </form>
            </div>
          ) : null}
        </Drawer>

        <ConfirmDialog
          open={confirmAction !== null}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title={confirmAction === "activate" ? "Korxonani faollashtirish" : "Korxonani to‘xtatish"}
          description={
            confirmAction === "activate"
              ? "Korxona faol holatga o‘tkaziladi."
              : "Korxona vaqtincha to‘xtatiladi. Bu holatda operatorlar kirishi cheklanadi."
          }
          confirmLabel="Tasdiqlash"
          destructive={confirmAction === "suspend"}
          onConfirm={() => {
            if (confirmAction === "activate") {
              activateTenant.mutate();
            }
            if (confirmAction === "suspend") {
              suspendTenant.mutate();
            }
            setConfirmAction(null);
          }}
        />
      </PlatformAdminShell>
    </PlatformAdminGate>
  );
}
