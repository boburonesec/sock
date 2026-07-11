"use client";

import { useQuery } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { auditApi } from "@/lib/api/audit";
import { queryKeys } from "@/lib/api/query-keys";

function formatWhen(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAction(action: string): string {
  return action.replaceAll("_", " ");
}

export function AuditModule() {
  const { data, error, isError, isPending, refetch } = useQuery({
    queryKey: queryKeys.audit.logs(),
    queryFn: () => auditApi.getLogs(150),
  });

  if (isPending) {
    return <LoadingState label="Audit jurnali yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Audit jurnali yuklanmadi"
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

  const logs = data?.data ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Muhim amallar tarixi (o‘zgartirish o‘chirilmaydi). So‘nggi{" "}
        {logs.length} yozuv.
      </p>
      <DataTable label="Audit jurnali">
        <DataTableHead>
          <DataTableRow>
            <DataTableHeader>Vaqt</DataTableHeader>
            <DataTableHeader>Amal</DataTableHeader>
            <DataTableHeader>Obyekt</DataTableHeader>
            <DataTableHeader>Operator</DataTableHeader>
            <DataTableHeader>ID</DataTableHeader>
          </DataTableRow>
        </DataTableHead>
        <tbody>
          {logs.length > 0 ? (
            logs.map((log) => (
              <DataTableRow key={log.id}>
                <DataTableCell className="whitespace-nowrap text-xs sm:text-sm">
                  {formatWhen(log.createdAt)}
                </DataTableCell>
                <DataTableCell className="font-semibold">
                  {formatAction(log.action)}
                </DataTableCell>
                <DataTableCell>{log.entityType}</DataTableCell>
                <DataTableCell>
                  {log.user?.name ?? "—"}
                  {log.user?.email ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {log.user.email}
                    </span>
                  ) : null}
                </DataTableCell>
                <DataTableCell className="max-w-[8rem] truncate text-xs text-muted-foreground">
                  {log.entityId ?? "—"}
                </DataTableCell>
              </DataTableRow>
            ))
          ) : (
            <EmptyTableState
              colSpan={5}
              title="Hozircha yozuv yo‘q"
              description="Korxonada amallar bajarilgach, audit shu yerda paydo bo‘ladi."
            />
          )}
        </tbody>
      </DataTable>
    </div>
  );
}
