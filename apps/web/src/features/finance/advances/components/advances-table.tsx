import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { Advance } from "@/lib/api/finance";
import { advanceStatusLabel, labelStatus } from "@/lib/status-labels";

const advanceStatusTone: Record<string, StatusTone> = {
  REQUESTED: "warning",
  APPROVED: "info",
  REJECTED: "danger",
  PAID: "success",
  APPLIED: "success",
  CANCELLED: "neutral",
};

function formatDate(value: string | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdvancesTable({ advances }: { advances: Advance[] }) {
  return (
    <DataTable label="Avans so‘rovlari">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Xodim</DataTableHeader>
          <DataTableHeader>Summa</DataTableHeader>
          <DataTableHeader>Sabab</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
          <DataTableHeader>So‘rov sanasi</DataTableHeader>
          <DataTableHeader>Tasdiqlovchi</DataTableHeader>
          <DataTableHeader>To‘lov sanasi</DataTableHeader>
          <DataTableHeader>Amallar</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {advances.length > 0 ? (
          advances.map((advance) => (
            <DataTableRow key={advance.id}>
              <DataTableCell className="font-semibold">
                {advance.employee.name}
              </DataTableCell>
              <DataTableCell>{advance.amount} so‘m</DataTableCell>
              <DataTableCell>{advance.reason}</DataTableCell>
              <DataTableCell>
                <StatusBadge tone={advanceStatusTone[advance.status] ?? "neutral"}>
                  {labelStatus(advanceStatusLabel, advance.status)}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell>{formatDate(advance.requestedAt)}</DataTableCell>
              <DataTableCell>{advance.approvedBy?.name ?? "—"}</DataTableCell>
              <DataTableCell>{formatDate(advance.paidAt)}</DataTableCell>
              <DataTableCell>
                <div className="flex gap-2">
                  <Button disabled variant="outline" className="h-8 px-2 text-xs">
                    Tasdiqlash (tez orada)
                  </Button>
                  <Button disabled variant="outline" className="h-8 px-2 text-xs">
                    Rad etish (tez orada)
                  </Button>
                  <Button disabled variant="outline" className="h-8 px-2 text-xs">
                    To‘lash · Keyingi
                  </Button>
                </div>
              </DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={8}
            title="Avanslar mavjud emas"
            description="Avans so‘rovlari yaratilgach, ular shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
