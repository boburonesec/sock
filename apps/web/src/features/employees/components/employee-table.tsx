import { UserRound } from "lucide-react";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import type { Employee } from "@/lib/api/employees";

interface EmployeeTableProps { employees: Employee[]; onSelect: (employee: Employee) => void; }
export function EmployeeTable({ employees, onSelect }: EmployeeTableProps) {
  return (
    <DataTable label="Xodimlar ro‘yxati">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Ism</DataTableHeader>
          <DataTableHeader>Status</DataTableHeader>
          <DataTableHeader>Yaratilgan</DataTableHeader>
          <DataTableHeader>Yangilangan</DataTableHeader>
          <DataTableHeader>Faollik / Payroll</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {employees.length > 0 ? (
          employees.map((employee) => (
            <DataTableRow key={employee.id} className="cursor-pointer hover:bg-muted/40">
              <DataTableCell>
                <button
                  onClick={() => onSelect(employee)}
                  className="flex items-center gap-3 text-left"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-muted">
                    <UserRound size={17} />
                  </span>
                  <span>
                    <span className="block font-semibold">{employee.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {employee.id}
                    </span>
                  </span>
                </button>
              </DataTableCell>
              <DataTableCell>
                <StatusBadge tone={employee.status === "ACTIVE" ? "success" : "neutral"}>
                  {employee.status}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell>{formatDate(employee.createdAt)}</DataTableCell>
              <DataTableCell>{formatDate(employee.updatedAt)}</DataTableCell>
              <DataTableCell className="text-muted-foreground">
                API data not available yet
              </DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={5}
            title="Xodimlar mavjud emas"
            description="Active xodimlar yaratilgach, ular shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
