"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlatformAdminGate } from "@/components/platform-admin/platform-admin-gate";
import { PlatformAdminShell } from "@/components/platform-admin/platform-admin-shell";
import { Drawer } from "@/components/overlays/drawer";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { platformAdminApi } from "@/lib/api/platform-admin";

const tenantsKey = ["platform-admin", "tenants"] as const;

export default function PlatformTenantsPage() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    planCode: "",
    notes: "",
  });

  const tenantsQuery = useQuery({
    queryKey: tenantsKey,
    queryFn: () => platformAdminApi.getTenants(),
  });

  const createTenant = useMutation({
    mutationFn: () =>
      platformAdminApi.createTenant({
        name: form.name,
        contactName: form.contactName || undefined,
        contactPhone: form.contactPhone || undefined,
        contactEmail: form.contactEmail || undefined,
        planCode: form.planCode || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantsKey });
      setDrawerOpen(false);
      setForm({
        name: "",
        contactName: "",
        contactPhone: "",
        contactEmail: "",
        planCode: "",
        notes: "",
      });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTenant.mutate();
  }

  return (
    <PlatformAdminGate>
      <PlatformAdminShell>
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Tenantlar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pilot va mijoz fabrikalarini manual provisioning qilish
            </p>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>Tenant yaratish</Button>
        </div>

        {tenantsQuery.isLoading && <LoadingState />}
        {tenantsQuery.isError && (
          <ErrorState
            description="Tenantlar yuklanmadi."
            action={<Button onClick={() => tenantsQuery.refetch()}>Qayta urinish</Button>}
          />
        )}
        {tenantsQuery.data && tenantsQuery.data.data.length === 0 && (
          <EmptyState title="Tenantlar yo‘q" description="Birinchi pilot tenantni yarating." />
        )}
        {tenantsQuery.data && tenantsQuery.data.data.length > 0 && (
          <div className="grid gap-4">
            {tenantsQuery.data.data.map((tenant) => (
              <Link
                key={tenant.id}
                href={`/admin/tenants/${tenant.id}`}
                className="panel block p-5 transition-colors hover:border-primary/50"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{tenant.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {tenant.contactName || "Kontakt yo‘q"} · {tenant.contactPhone || "Telefon yo‘q"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border px-3 py-1">{tenant.status}</span>
                    <span className="rounded-full border px-3 py-1">
                      Factory: {tenant.factoryCount ?? "0"}
                    </span>
                    <span className="rounded-full border px-3 py-1">
                      User: {tenant.userCount ?? "0"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Drawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title="Tenant yaratish"
          description="Yangi organization/pilot tenant ochish"
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormField htmlFor="tenant-name" label="Nomi" required>
              <Input id="tenant-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </FormField>
            <FormField htmlFor="contact-name" label="Kontakt shaxs">
              <Input id="contact-name" value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} />
            </FormField>
            <FormField htmlFor="contact-phone" label="Telefon">
              <Input id="contact-phone" value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} />
            </FormField>
            <FormField htmlFor="contact-email" label="Email">
              <Input id="contact-email" type="email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} />
            </FormField>
            <FormField htmlFor="plan-code" label="Plan kodi">
              <Input id="plan-code" value={form.planCode} onChange={(event) => setForm({ ...form, planCode: event.target.value })} />
            </FormField>
            <FormField htmlFor="notes" label="Izoh">
              <Textarea id="notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </FormField>
            {createTenant.isError && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                Tenant yaratilmadi. Ma’lumotlarni tekshiring.
              </p>
            )}
            <Button className="w-full" type="submit" disabled={!form.name.trim() || createTenant.isPending}>
              {createTenant.isPending ? "Yaratilmoqda..." : "Tenant yaratish"}
            </Button>
          </form>
        </Drawer>
      </PlatformAdminShell>
    </PlatformAdminGate>
  );
}
