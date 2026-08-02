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
import { StatusBadge } from "@/components/data-display/status-badge";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { financeApi } from "@/lib/api/finance";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTimeForUser } from "@/lib/format";
import { advanceStatusLabel, labelStatus } from "@/lib/status-labels";

type Kind = "bonus" | "penalty";

export function AdjustmentsListModule({ kind }: { kind: Kind }) {
  const isBonus = kind === "bonus";
  const { data, error, isError, isPending, refetch } = useQuery({
    queryKey: isBonus ? queryKeys.finance.bonuses() : queryKeys.finance.penalties(),
    queryFn: () => (isBonus ? financeApi.getBonuses() : financeApi.getPenalties()),
  });

  if (isPending) {
    return (
      <LoadingState
        label={isBonus ? "Bonuslar yuklanmoqda..." : "Jarimalar yuklanmoqda..."}
      />
    );
  }

  if (isError) {
    return (
      <ErrorState
        title={isBonus ? "Bonuslar yuklanmadi" : "Jarimalar yuklanmadi"}
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

  const rows = data?.data ?? [];
  const emptyTitle = isBonus ? "Bonuslar yo‘q" : "Jarimalar yo‘q";
  const emptyDescription = isBonus
    ? "Bonus yozuvlari xodim kartasidan yoki moliya bo‘limidan qo‘shilgach shu yerda ko‘rinadi."
    : "Jarima yozuvlari xodim kartasidan yoki moliya bo‘limidan qo‘shilgach shu yerda ko‘rinadi.";

  return (
    <DataTable label={isBonus ? "Bonuslar" : "Jarimalar"}>
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Xodim</DataTableHeader>
          <DataTableHeader>Summa</DataTableHeader>
          <DataTableHeader>Sabab</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
          <DataTableHeader>Sana</DataTableHeader>
          <DataTableHeader>Kim kiritgan</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {rows.length > 0 ? (
          rows.map((row) => (
            <DataTableRow key={row.id}>
              <DataTableCell className="font-semibold">{row.employee.name}</DataTableCell>
              <DataTableCell>{row.amount} so‘m</DataTableCell>
              <DataTableCell>{row.reason}</DataTableCell>
              <DataTableCell>
                <StatusBadge tone="info">
                  {labelStatus(advanceStatusLabel, row.status)}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell>{formatDateTimeForUser(row.requestedAt)}</DataTableCell>
              <DataTableCell>{row.requestedBy?.name ?? "—"}</DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={6}
            title={emptyTitle}
            description={emptyDescription}
          />
        )}
      </tbody>
    </DataTable>
  );
}
