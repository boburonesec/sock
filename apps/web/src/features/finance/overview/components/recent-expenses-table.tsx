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
import { formatDateShort } from "@/lib/format";

const statusTone: Record<string, StatusTone> = {
  REQUESTED: "warning",
  APPROVED: "info",
  REJECTED: "danger",
  PAID: "success",
  CANCELLED: "neutral",
  DRAFT: "neutral",
  PENDING: "warning",
};

function formatDate(value: string): string {
  return formatDateShort(new Date(value),);
}

export function RecentExpensesTable({ expenses }: { expenses: Expense[] }) {
  return (
    <DataTable label="So‘nggi xarajatlar">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Kategoriya</DataTableHeader>
          <DataTableHeader>Summa</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
          <DataTableHeader>Sana</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {expenses.length > 0 ? (
          expenses.map((expense) => (
            <DataTableRow key={expense.id}>
              <DataTableCell className="font-semibold">
                {expense.category.name}
              </DataTableCell>
              <DataTableCell>{formatCurrency(expense.amount)}</DataTableCell>
              <DataTableCell>
                <StatusBadge tone={statusTone[expense.status] ?? "neutral"}>
                  {labelStatus(expenseStatusLabel, expense.status)}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell>{formatDate(expense.requestedAt)}</DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={4}
            title="Xarajatlar mavjud emas"
            description="Xarajat yozuvlari paydo bo‘lgach, ular shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
