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

const expenseStatusTone: Record<string, StatusTone> = {
  REQUESTED: "warning",
  APPROVED: "info",
  REJECTED: "danger",
  PAID: "success",
  CANCELLED: "neutral",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ExpensesTable({ expenses }: { expenses: Expense[] }) {
  return (
    <DataTable label="Xarajat so‘rovlari">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Kategoriya</DataTableHeader>
          <DataTableHeader>Summa</DataTableHeader>
          <DataTableHeader>Sabab</DataTableHeader>
          <DataTableHeader>So‘rovchi</DataTableHeader>
          <DataTableHeader>Status</DataTableHeader>
          <DataTableHeader>So‘rov sanasi</DataTableHeader>
          <DataTableHeader>Tasdiqlovchi</DataTableHeader>
          <DataTableHeader>To‘lov sanasi</DataTableHeader>
          <DataTableHeader>Amallar</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {expenses.length > 0 ? (
          expenses.map((expense) => (
            <DataTableRow key={expense.id}>
              <DataTableCell className="font-semibold">
                {expense.category.name}
              </DataTableCell>
              <DataTableCell>{expense.amount} so‘m</DataTableCell>
              <DataTableCell>{expense.reason}</DataTableCell>
              <DataTableCell>{expense.requestedBy?.name ?? "—"}</DataTableCell>
              <DataTableCell>
                <StatusBadge tone={expenseStatusTone[expense.status] ?? "neutral"}>
                  {expense.status}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell>{formatDate(expense.requestedAt)}</DataTableCell>
              <DataTableCell>{expense.approvedBy?.name ?? "—"}</DataTableCell>
              <DataTableCell>
                {expense.paidAt ? formatDate(expense.paidAt) : "—"}
              </DataTableCell>
              <DataTableCell>
                <div className="flex gap-2">
                  <Button disabled variant="outline" className="h-8 px-2 text-xs">
                    Tasdiqlash · Keyingi
                  </Button>
                  <Button disabled variant="outline" className="h-8 px-2 text-xs">
                    Rad etish · Keyingi
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
            colSpan={9}
            title="Xarajatlar mavjud emas"
            description="Xarajat so‘rovlari yaratilgach, ular shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
