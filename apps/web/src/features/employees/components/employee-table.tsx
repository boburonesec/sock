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
import { formatDateTimeForUser } from "@/lib/format";

interface EmployeeTableProps { employees: Employee[]; onSelect: (employee: Employee) => void; }
export function EmployeeTable({ employees, onSelect }: EmployeeTableProps) {
  return (
    <DataTable label="Xodimlar ro‘yxati">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Ism</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
          <DataTableHeader>Yaratilgan</DataTableHeader>
          <DataTableHeader>Yangilangan</DataTableHeader>
          <DataTableHeader>Faollik / ish haqi</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {employees.length > 0 ? (
          employees.map((employee) => (
            <DataTableRow
              key={employee.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => onSelect(employee)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(employee);
                }
              }}
            >
              <DataTableCell>
                <div className="flex items-center gap-3 text-left">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-muted">
                    <UserRound size={17} />
                  </span>
                  <span>
                    <span className="block font-semibold">{employee.name}</span>
                  </span>
                </div>
              </DataTableCell>
              <DataTableCell>
                <StatusBadge tone={employee.status === "ACTIVE" ? "success" : "neutral"}>
                  {employee.status === "ACTIVE" ? "Faol" : "Nofaol"}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell>{formatDateTimeForUser(employee.createdAt)}</DataTableCell>
              <DataTableCell>{formatDateTimeForUser(employee.updatedAt)}</DataTableCell>
              <DataTableCell className="text-muted-foreground">
                Hozircha ma’lumot yo‘q
              </DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={5}
            title="Xodimlar yo‘q"
            description="Xodim qo‘shilgach, shu ro‘yxatda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
