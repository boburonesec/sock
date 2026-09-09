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
import type { Expense } from "@/lib/api/finance";
import { expenseStatusLabel, labelStatus } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";
import { formatDateTimeForUser } from "@/lib/format";
import { expenseStatusTone, getVisibleExpenseActions } from "../lib/expense-actions";
import { ExpenseCard } from "./expense-card";

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
    <ResponsiveDataList
      items={expenses}
      getKey={(expense) => expense.id}
      renderCard={(expense) => (
        <ExpenseCard
          expense={expense}
          busy={busyId === expense.id}
          isRequester={!allowRequesterBypass && expense.requestedBy?.id === currentUserId}
          canApprove={canApprove}
          canPay={canPay}
          onApprove={onApprove}
          onReject={onReject}
          onPay={onPay}
          onCancel={onCancel}
        />
      )}
      ariaLabel="Xarajat so‘rovlari"
      emptyTitle="Xarajatlar mavjud emas"
      emptyDescription="Xarajat so‘rovlari yaratilgach, ular shu yerda ko‘rinadi."
    >
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
            const actions = getVisibleExpenseActions(expense, { canApprove, canPay, isRequester });
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
                    {actions.approve ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-9 px-3 text-xs"
                        disabled={busy}
                        onClick={() => onApprove?.(expense)}
                      >
                        Tasdiqlash
                      </Button>
                    ) : null}
                    {actions.reject ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-9 px-3 text-xs"
                        disabled={busy}
                        onClick={() => onReject?.(expense)}
                      >
                        Rad etish
                      </Button>
                    ) : null}
                    {actions.cancel ? (
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
                    {actions.pay ? (
                      <Button
                        type="button"
                        className="min-h-9 px-3 text-xs"
                        disabled={busy}
                        onClick={() => onPay?.(expense)}
                      >
                        To‘lash
                      </Button>
                    ) : null}
                    {!actions.approve && !actions.reject && !actions.cancel && !actions.pay ? (
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
    </ResponsiveDataList>
  );
}
