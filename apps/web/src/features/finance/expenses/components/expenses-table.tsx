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
import type { Expense } from "@/lib/api/finance";
import { expenseStatusLabel, labelStatus } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";
import { formatDateTimeForUser } from "@/lib/format";

const expenseStatusTone: Record<string, StatusTone> = {
  REQUESTED: "warning",
  APPROVED: "info",
  REJECTED: "danger",
  PAID: "success",
  CANCELLED: "neutral",
};

function formatDate(value: string): string {
  return formatDateTimeForUser(new Date(value));
}

export function ExpensesTable({
  expenses,
  busyId,
  currentUserId,
  canApprove = false,
  canPay = false,
  allowRequesterBypass = false,
  onApprove,
  onReject,
  onPay,
  onCancel,
}: {
  expenses: Expense[];
  busyId?: string | null;
  currentUserId?: string | null;
  canApprove?: boolean;
  canPay?: boolean;
  allowRequesterBypass?: boolean;
  onApprove?: (expense: Expense) => void;
  onReject?: (expense: Expense) => void;
  onPay?: (expense: Expense) => void;
  onCancel?: (expense: Expense) => void;
}) {
  return (
    <DataTable label="Xarajat so‘rovlari">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Kategoriya</DataTableHeader>
          <DataTableHeader>Summa</DataTableHeader>
          <DataTableHeader>Sabab</DataTableHeader>
          <DataTableHeader>So‘rovchi</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
          <DataTableHeader>So‘rov sanasi</DataTableHeader>
          <DataTableHeader>Tasdiqlovchi</DataTableHeader>
          <DataTableHeader>To‘lov sanasi</DataTableHeader>
          <DataTableHeader>Amallar</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {expenses.length > 0 ? (
          expenses.map((expense) => {
            const busy = busyId === expense.id;
            const isRequester =
              !allowRequesterBypass && expense.requestedBy?.id === currentUserId;
            return (
              <DataTableRow key={expense.id}>
                <DataTableCell className="font-semibold">
                  {expense.category.name}
                </DataTableCell>
                <DataTableCell>{formatCurrency(expense.amount)}</DataTableCell>
                <DataTableCell>{expense.reason}</DataTableCell>
                <DataTableCell>{expense.requestedBy?.name ?? "—"}</DataTableCell>
                <DataTableCell>
                  <StatusBadge tone={expenseStatusTone[expense.status] ?? "neutral"}>
                    {labelStatus(expenseStatusLabel, expense.status)}
                  </StatusBadge>
                </DataTableCell>
                <DataTableCell>{formatDate(expense.requestedAt)}</DataTableCell>
                <DataTableCell>{expense.approvedBy?.name ?? "—"}</DataTableCell>
                <DataTableCell>
                  {expense.paidAt ? formatDate(expense.paidAt) : "—"}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex flex-wrap gap-2">
                    {expense.status === "REQUESTED" && canApprove && !isRequester ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-9 px-3 text-xs"
                          disabled={busy}
                          onClick={() => onApprove?.(expense)}
                        >
                          Tasdiqlash
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-9 px-3 text-xs"
                          disabled={busy}
                          onClick={() => onReject?.(expense)}
                        >
                          Rad etish
                        </Button>
                      </>
                    ) : null}
                    {expense.status === "REQUESTED" ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-9 px-3 text-xs"
                        disabled={busy}
                        onClick={() => onCancel?.(expense)}
                      >
                        Bekor
                      </Button>
                    ) : null}
                    {expense.status === "APPROVED" && canPay && !isRequester ? (
                        <Button
                          type="button"
                          className="min-h-9 px-3 text-xs"
                          disabled={busy}
                          onClick={() => onPay?.(expense)}
                        >
                          To‘lash
                        </Button>
                    ) : null}
                    {expense.status === "APPROVED" ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-9 px-3 text-xs"
                          disabled={busy}
                          onClick={() => onCancel?.(expense)}
                        >
                          Bekor
                        </Button>
                    ) : null}
                    {expense.status !== "REQUESTED" && expense.status !== "APPROVED" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : null}
                  </div>
                </DataTableCell>
              </DataTableRow>
            );
          })
        ) : (
          <EmptyTableState
            colSpan={9}
            title="Xarajatlar mavjud emas"
            description="Xarajat so‘rovlari yaratilgach, ular shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
