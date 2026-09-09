import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ResponsiveDataList } from "@/components/data-display/responsive-data-list";
import { StatusBadge } from "@/components/data-display/status-badge";
import type { Advance } from "@/lib/api/finance";
import { advanceStatusLabel, labelStatus } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";
import { formatDateTimeForUser } from "@/lib/format";
import { advanceStatusTone, getVisibleAdvanceActions } from "../lib/advance-actions";
import { AdvanceCard } from "./advance-card";

function formatDate(value: string | null): string {
  if (!value) return "—";

  return formatDateTimeForUser(new Date(value));
}

export function AdvancesTable({
  advances,
  busyId,
  currentUserId,
  canApprove = false,
  canPay = false,
  allowRequesterBypass = false,
  onApprove,
  onReject,
  onPay,
}: {
  advances: Advance[];
  busyId?: string | null;
  currentUserId?: string | null;
  canApprove?: boolean;
  canPay?: boolean;
  allowRequesterBypass?: boolean;
  onApprove?: (advance: Advance) => void;
  onReject?: (advance: Advance) => void;
  onPay?: (advance: Advance) => void;
}) {
  return (
    <ResponsiveDataList
      items={advances}
      getKey={(advance) => advance.id}
      renderCard={(advance) => (
        <AdvanceCard
          advance={advance}
          busy={busyId === advance.id}
          isRequester={!allowRequesterBypass && advance.requestedBy?.id === currentUserId}
          canApprove={canApprove}
          canPay={canPay}
          onApprove={onApprove}
          onReject={onReject}
          onPay={onPay}
        />
      )}
      ariaLabel="Avans so‘rovlari"
      emptyTitle="Avanslar mavjud emas"
      emptyDescription="Avans so‘rovlari yaratilgach, ular shu yerda ko‘rinadi."
    >
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
          advances.map((advance) => {
            const busy = busyId === advance.id;
            const isRequester =
              !allowRequesterBypass && advance.requestedBy?.id === currentUserId;
            const actions = getVisibleAdvanceActions(advance, { canApprove, canPay, isRequester });
            return (
              <DataTableRow key={advance.id}>
                <DataTableCell className="font-semibold">
                  {advance.employee.name}
                </DataTableCell>
                <DataTableCell>{formatCurrency(advance.amount)}</DataTableCell>
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
                  <div className="flex flex-wrap gap-2">
                    {actions.approve ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-2 text-xs"
                        disabled={busy}
                        onClick={() => onApprove?.(advance)}
                      >
                        Tasdiqlash
                      </Button>
                    ) : null}
                    {actions.reject ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-2 text-xs"
                        disabled={busy}
                        onClick={() => onReject?.(advance)}
                      >
                        Rad etish
                      </Button>
                    ) : null}
                    {actions.pay ? (
                      <Button
                        type="button"
                        className="h-8 px-2 text-xs"
                        disabled={busy}
                        onClick={() => onPay?.(advance)}
                      >
                        To‘lash
                      </Button>
                    ) : null}
                    {advance.status !== "REQUESTED" && advance.status !== "APPROVED" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : null}
                  </div>
                </DataTableCell>
              </DataTableRow>
            );
          })
        ) : (
          <EmptyTableState
            colSpan={8}
            title="Avanslar mavjud emas"
            description="Avans so‘rovlari yaratilgach, ular shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
    </ResponsiveDataList>
  );
}
