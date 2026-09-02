"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { productApi } from "@/lib/api/product";
import { settingsApi } from "@/lib/api/settings";
import { warehouseApi } from "@/lib/api/warehouse";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateShort } from "@/lib/format";
import {
  formatPermissionKey,
  formatRoleName,
  formatWarehouseZoneName,
} from "@/lib/status-labels";

export function SettingsZonesPage() {
  const { data, error, isError, isPending, refetch } = useQuery({
    queryKey: queryKeys.warehouse.zones(),
    queryFn: warehouseApi.getZones,
  });

  if (isPending) {
    return <LoadingState label="Ombor zonalari yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Ombor zonalari yuklanmadi"
        description={error instanceof Error ? error.message : "Xatolik yuz berdi."}
        action={
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const zones = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Ombor zonalari"
        description="Korxonadagi ombor zonalari ro‘yxati. Qoldiq va harakatlar Ombor bo‘limida yuritiladi."
        action={
          <Link href="/warehouse/zones">
            <Button type="button" variant="outline">
              Ombor qoldig‘iga o‘tish
            </Button>
          </Link>
        }
      />
      <DataTable label="Ombor zonalari">
        <DataTableHead>
          <DataTableRow>
            <DataTableHeader>Zona</DataTableHeader>
            <DataTableHeader>Ombor</DataTableHeader>
            <DataTableHeader>Mahsulot yozuvlari</DataTableHeader>
            <DataTableHeader>Material yozuvlari</DataTableHeader>
          </DataTableRow>
        </DataTableHead>
        <tbody>
          {zones.length > 0 ? (
            zones.map((zone) => (
              <DataTableRow key={zone.id}>
                <DataTableCell className="font-semibold">{formatWarehouseZoneName(zone.name)}</DataTableCell>
                <DataTableCell>{formatWarehouseZoneName(zone.warehouse.name)}</DataTableCell>
                <DataTableCell>{zone.productStockRecordCount}</DataTableCell>
                <DataTableCell>{zone.materialStockRecordCount}</DataTableCell>
              </DataTableRow>
            ))
          ) : (
            <EmptyTableState
              colSpan={4}
              title="Zonalar yo‘q"
              description="Korxona yaratilganda default zonalar paydo bo‘ladi."
            />
          )}
        </tbody>
      </DataTable>
    </>
  );
}

export function SettingsRolesPage() {
  const rolesQuery = useQuery({
    queryKey: queryKeys.settings.roles(),
    queryFn: settingsApi.getRoles,
  });

  if (rolesQuery.isPending) {
    return <LoadingState label="Rollar yuklanmoqda..." />;
  }

  if (rolesQuery.isError) {
    return (
      <ErrorState
        title="Rollar yuklanmadi"
        description={
          rolesQuery.error instanceof Error
            ? rolesQuery.error.message
            : "Xatolik yuz berdi."
        }
        action={
          <Button type="button" variant="outline" onClick={() => rolesQuery.refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const roles = rolesQuery.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Rollar"
        description="Har bir rol dasturda qanday ishlarni bajarishi mumkinligi. Operatorga rol biriktirish — Korxona sozlamalaridan. Ishbay ishchilar — Xodimlar bo‘limida."
        action={
          <Link href="/settings/company">
            <Button type="button" variant="outline">
              Operatorlar
            </Button>
          </Link>
        }
      />

      <p className="mb-4 text-sm text-muted-foreground">
        Rollar hozircha tayyor holda beriladi va ularni o‘zgartirib bo‘lmaydi.
        Har bir operatorga bajaradigan ishiga mos rolni tanlang.
      </p>

      {roles.length === 0 ? (
        <EmptyState
          title="Rollar yo‘q"
          description="Korxona yaratilganda default rollar avtomatik qo‘shiladi."
        />
      ) : (
        <div className="grid gap-4">
          {roles.map((role) => (
            <article key={role.id} className="panel space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">{formatRoleName(role.name)}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tizim nomi: {role.name} · {role.permissionCount} ta ruxsat
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Yangilangan: {formatDateShort(role.updatedAt)}
                </p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {role.permissions.length > 0 ? (
                  role.permissions.map((permission) => (
                    <li
                      key={permission.id}
                      className="rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                    >
                      {formatPermissionKey(permission.key)}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-muted-foreground">Ruxsat biriktirilmagan.</li>
                )}
              </ul>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export function SettingsExpenseCategoriesPage() {
  const { data, error, isError, isPending, refetch } = useQuery({
    queryKey: queryKeys.settings.expenseCategories(),
    queryFn: settingsApi.getExpenseCategories,
  });

  if (isPending) {
    return <LoadingState label="Xarajat kategoriyalari yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Xarajat kategoriyalari yuklanmadi"
        description={error instanceof Error ? error.message : "Xatolik yuz berdi."}
        action={
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const categories = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Xarajat kategoriyalari"
        description="Moliya modulidagi xarajatlar uchun kategoriyalar"
      />
      <DataTable label="Xarajat kategoriyalari">
        <DataTableHead>
          <DataTableRow>
            <DataTableHeader>Nomi</DataTableHeader>
            <DataTableHeader>Yangilangan</DataTableHeader>
          </DataTableRow>
        </DataTableHead>
        <tbody>
          {categories.length > 0 ? (
            categories.map((category) => (
              <DataTableRow key={category.id}>
                <DataTableCell className="font-semibold">{category.name}</DataTableCell>
                <DataTableCell>{formatDateShort(category.updatedAt)}</DataTableCell>
              </DataTableRow>
            ))
          ) : (
            <EmptyTableState
              colSpan={2}
              title="Kategoriyalar yo‘q"
              description="Korxona yaratilganda yoki seedda default kategoriyalar bo‘lishi mumkin."
            />
          )}
        </tbody>
      </DataTable>
    </>
  );
}

export function SettingsThresholdsPage() {
  const queryClient = useQueryClient();
  const thresholdsQuery = useQuery({
    queryKey: queryKeys.warehouse.lowStockThresholds(),
    queryFn: warehouseApi.getLowStockThresholds,
  });
  const materialsQuery = useQuery({
    queryKey: queryKeys.product.materials(),
    queryFn: productApi.getMaterials,
  });
  const zonesQuery = useQuery({
    queryKey: queryKeys.warehouse.zones(),
    queryFn: warehouseApi.getZones,
  });
  const [form, setForm] = useState({ warehouseId: "", materialId: "", quantity: "" });
  const [feedback, setFeedback] = useState<string | null>(null);

  const warehouses = useMemo(() => {
    const map = new Map<string, string>();
    for (const zone of zonesQuery.data?.data ?? []) {
      map.set(zone.warehouse.id, zone.warehouse.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [zonesQuery.data]);

  const upsertMutation = useMutation({
    mutationFn: () =>
      warehouseApi.upsertLowStockThreshold({
        warehouseId: form.warehouseId,
        materialId: form.materialId,
        quantity: form.quantity,
      }),
    onSuccess: async () => {
      setFeedback("Limit saqlandi.");
      setForm((current) => ({ ...current, quantity: "" }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.lowStockThresholds() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.stockSummary() }),
      ]);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Limit saqlanmadi.");
    },
  });

  if (thresholdsQuery.isPending || materialsQuery.isPending || zonesQuery.isPending) {
    return <LoadingState label="Limitlar yuklanmoqda..." />;
  }

  if (thresholdsQuery.isError) {
    return (
      <ErrorState
        title="Limitlar yuklanmadi"
        description={
          thresholdsQuery.error instanceof Error
            ? thresholdsQuery.error.message
            : "Xatolik yuz berdi."
        }
        action={
          <Button type="button" variant="outline" onClick={() => thresholdsQuery.refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const thresholds = thresholdsQuery.data?.data ?? [];
  const materials = materialsQuery.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Limitlar"
        description="Material qancha qolganda ogohlantirish chiqishini belgilang"
      />

      <section className="panel mb-6 space-y-4 p-5">
        <h2 className="font-semibold">Limit qo‘yish / yangilash</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Ombor</span>
            <select
              className="flex h-11 w-full rounded-lg border bg-background px-3 text-sm"
              value={form.warehouseId}
              onChange={(event) => setForm({ ...form, warehouseId: event.target.value })}
            >
              <option value="">Tanlang</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {formatWarehouseZoneName(warehouse.name)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Material</span>
            <select
              className="flex h-11 w-full rounded-lg border bg-background px-3 text-sm"
              value={form.materialId}
              onChange={(event) => setForm({ ...form, materialId: event.target.value })}
            >
              <option value="">Tanlang</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Minimal miqdor</span>
            <Input
              inputMode="decimal"
              placeholder="Masalan: 10"
              value={form.quantity}
              onChange={(event) => setForm({ ...form, quantity: event.target.value })}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={
              !form.warehouseId ||
              !form.materialId ||
              !form.quantity.trim() ||
              upsertMutation.isPending
            }
            onClick={() => upsertMutation.mutate()}
          >
            {upsertMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
          <Link href="/warehouse" className="text-sm font-semibold text-primary hover:underline">
            Ombor past qoldiqlariga o‘tish →
          </Link>
        </div>
        {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
      </section>

      <DataTable label="Past qoldiq limitalari">
        <DataTableHead>
          <DataTableRow>
            <DataTableHeader>Material</DataTableHeader>
            <DataTableHeader>Ombor</DataTableHeader>
            <DataTableHeader>Minimal miqdor</DataTableHeader>
            <DataTableHeader>Yangilangan</DataTableHeader>
          </DataTableRow>
        </DataTableHead>
        <tbody>
          {thresholds.length > 0 ? (
            thresholds.map((threshold) => (
              <DataTableRow key={threshold.id}>
                <DataTableCell className="font-semibold">{threshold.material.name}</DataTableCell>
                <DataTableCell>{formatWarehouseZoneName(threshold.warehouse.name)}</DataTableCell>
                <DataTableCell>{threshold.quantity}</DataTableCell>
                <DataTableCell>{formatDateShort(threshold.updatedAt)}</DataTableCell>
              </DataTableRow>
            ))
          ) : (
            <EmptyTableState
              colSpan={4}
              title="Limitlar yo‘q"
              description="Material qancha qolganda ogohlantirish kerakligini kiriting."
            />
          )}
        </tbody>
      </DataTable>
    </>
  );
}
