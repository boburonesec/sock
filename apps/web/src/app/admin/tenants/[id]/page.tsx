"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
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
import { platformAdminApi } from "@/lib/api/platform-admin";

export default function PlatformTenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params.id;
  const queryClient = useQueryClient();
  const tenantKey = ["platform-admin", "tenant", tenantId] as const;
  const healthKey = ["platform-admin", "tenant-health", tenantId] as const;
  const tenantsKey = ["platform-admin", "tenants"] as const;
  const [factoryDrawerOpen, setFactoryDrawerOpen] = useState(false);
  const [ownerDrawerOpen, setOwnerDrawerOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"activate" | "suspend" | null>(null);
  const [factoryForm, setFactoryForm] = useState({ name: "", location: "" });
  const [ownerForm, setOwnerForm] = useState({
    name: "",
    email: "",
    password: "ChangeMe123!",
    factoryId: "",
  });
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

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

  const createFactory = useMutation({
    mutationFn: () =>
      platformAdminApi.createFactory(tenantId, {
        name: factoryForm.name,
        location: factoryForm.location || undefined,
      }),
    onSuccess: async () => {
      await invalidateTenant();
      setFactoryDrawerOpen(false);
      setFactoryForm({ name: "", location: "" });
    },
  });

  const createOwner = useMutation({
    mutationFn: () =>
      platformAdminApi.createOwnerUser(tenantId, {
        name: ownerForm.name,
        email: ownerForm.email,
        password: ownerForm.password || undefined,
        factoryId: ownerForm.factoryId,
      }),
    onSuccess: async (response) => {
      await invalidateTenant();
      setGeneratedPassword(response.data.generatedPassword);
      setOwnerDrawerOpen(false);
      setOwnerForm({ name: "", email: "", password: "ChangeMe123!", factoryId: "" });
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

  function submitFactory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createFactory.mutate();
  }

  function submitOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createOwner.mutate();
  }

  const tenant = tenantQuery.data?.data;
  const health = healthQuery.data?.data;

  return (
    <PlatformAdminGate>
      <PlatformAdminShell>
        <div className="mb-6">
          <Link href="/admin/tenants" className="text-sm text-muted-foreground hover:text-foreground">
            ← Tenantlar
          </Link>
        </div>

        {tenantQuery.isLoading && <LoadingState />}
        {tenantQuery.isError && (
          <ErrorState
            description="Tenant ma’lumotlari yuklanmadi."
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
                    <span className="rounded-full border px-3 py-1">{tenant.status}</span>
                    <span className="rounded-full border px-3 py-1">
                      Subscription: {tenant.subscriptionStatus}
                    </span>
                    {tenant.planCode && (
                      <span className="rounded-full border px-3 py-1">Plan: {tenant.planCode}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => setFactoryDrawerOpen(true)}>
                    Factory yaratish
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setOwnerForm((current) => ({
                      ...current,
                      factoryId: current.factoryId || tenant.factories[0]?.id || "",
                    }));
                    setOwnerDrawerOpen(true);
                  }}>
                    Owner user yaratish
                  </Button>
                  <Button onClick={() => setConfirmAction("activate")} disabled={tenant.status === "ACTIVE"}>
                    Activate
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmAction("suspend")} disabled={tenant.status === "SUSPENDED"}>
                    Suspend
                  </Button>
                </div>
              </div>
            </section>

            {generatedPassword && (
              <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                <p className="font-semibold">Temporary password — faqat bir marta ko‘rsatiladi</p>
                <p className="mt-1 font-mono">{generatedPassword}</p>
              </section>
            )}

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="panel p-5">
                <h2 className="font-semibold">Factorylar</h2>
                <div className="mt-4 space-y-3">
                  {tenant.factories.length === 0 && <p className="text-sm text-muted-foreground">Factory yo‘q.</p>}
                  {tenant.factories.map((factory) => (
                    <div key={factory.id} className="rounded-xl border p-3">
                      <p className="font-medium">{factory.name}</p>
                      <p className="text-xs text-muted-foreground">{factory.id}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel p-5">
                <h2 className="font-semibold">Tenant userlar</h2>
                <div className="mt-4 space-y-3">
                  {tenant.users.length === 0 && <p className="text-sm text-muted-foreground">User yo‘q.</p>}
                  {tenant.users.map((user) => (
                    <div key={user.id} className="rounded-xl border p-3">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email} · {user.status}</p>
                    </div>
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
                      <p className="text-xs text-muted-foreground">{key}</p>
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

        <Drawer open={factoryDrawerOpen} onOpenChange={setFactoryDrawerOpen} title="Factory yaratish">
          <form className="space-y-4" onSubmit={submitFactory}>
            <FormField htmlFor="factory-name" label="Factory nomi" required>
              <Input id="factory-name" value={factoryForm.name} onChange={(event) => setFactoryForm({ ...factoryForm, name: event.target.value })} />
            </FormField>
            <FormField htmlFor="factory-location" label="Location">
              <Input id="factory-location" value={factoryForm.location} onChange={(event) => setFactoryForm({ ...factoryForm, location: event.target.value })} />
            </FormField>
            <p className="text-xs text-muted-foreground">
              Factory bilan birga Main Warehouse, zonalar va ishlab chiqarish bosqichlari yaratiladi.
            </p>
            {createFactory.isError && <p className="text-sm text-rose-300">Factory yaratilmadi.</p>}
            <Button className="w-full" disabled={!factoryForm.name.trim() || createFactory.isPending}>
              {createFactory.isPending ? "Yaratilmoqda..." : "Factory yaratish"}
            </Button>
          </form>
        </Drawer>

        <Drawer open={ownerDrawerOpen} onOpenChange={setOwnerDrawerOpen} title="Owner user yaratish">
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
            <FormField htmlFor="owner-factory" label="Factory" required>
              <select
                id="owner-factory"
                className="flex h-11 w-full rounded-lg border bg-background px-3 text-sm"
                value={ownerForm.factoryId}
                onChange={(event) => setOwnerForm({ ...ownerForm, factoryId: event.target.value })}
              >
                <option value="">Factory tanlang</option>
                {tenant?.factories.map((factory) => (
                  <option key={factory.id} value={factory.id}>{factory.name}</option>
                ))}
              </select>
            </FormField>
            {createOwner.isError && <p className="text-sm text-rose-300">Owner user yaratilmadi.</p>}
            <Button className="w-full" disabled={!ownerForm.name.trim() || !ownerForm.email.trim() || !ownerForm.factoryId || createOwner.isPending}>
              {createOwner.isPending ? "Yaratilmoqda..." : "Owner user yaratish"}
            </Button>
          </form>
        </Drawer>

        <ConfirmDialog
          open={confirmAction !== null}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title={confirmAction === "activate" ? "Tenantni activate qilish" : "Tenantni suspend qilish"}
          description={
            confirmAction === "activate"
              ? "Tenant Faol holatga o‘tkaziladi."
              : "Tenant SUSPENDED holatga o‘tkaziladi. Login enforcement keyingi milestone’da."
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
