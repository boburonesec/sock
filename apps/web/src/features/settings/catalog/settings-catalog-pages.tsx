"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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
import { settingsApi } from "@/lib/api/settings";
import { warehouseApi } from "@/lib/api/warehouse";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateShort } from "@/lib/format";
import { formatPermissionKey, formatRoleName } from "@/lib/status-labels";

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
                <DataTableCell className="font-semibold">{zone.name}</DataTableCell>
                <DataTableCell>{zone.warehouse.name}</DataTableCell>
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
        description="Har bir rol qanday ishlarni bajarishi mumkinligi. Foydalanuvchiga rol biriktirish — Korxona sozlamalaridan."
        action={
          <Link href="/settings/company">
            <Button type="button" variant="outline">
              Foydalanuvchilar
            </Button>
          </Link>
        }
      />

      <p className="mb-4 text-sm text-muted-foreground">
        Hozircha rollar tizim tomonidan beriladi (o‘zgartirish/yangi rol ochish MVP da yo‘q).
        Operator uchun muhimi: foydalanuvchiga to‘g‘ri rolni tanlash.
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
  return (
    <>
      <PageHeader
        title="Limitlar"
        description="Kam qoldiq va boshqa operatsion chegaralar"
      />
      <div className="panel space-y-3 p-5 text-sm text-muted-foreground">
        <p>
          Kam qoldiq (low stock) chegarasi material yozuvlari bilan bog‘liq.
          Hozirgi MVP da alohida “limit sozlash” formasi hali to‘liq ochilmagan;
          ombor materiallar sahifasida past qoldiq holati ko‘rsatiladi.
        </p>
        <Link href="/warehouse/materials" className="font-semibold text-primary hover:underline">
          Materiallar omboriga o‘tish →
        </Link>
      </div>
    </>
  );
}
