import { DataTable, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { ExecutiveHealthStatus, ExecutiveSummary } from "@/lib/api/dashboard";

type TopClient = ExecutiveSummary["topClients"][number];

const statusLabels: Record<ExecutiveHealthStatus, string> = {
  GOOD: "Yaxshi",
  WARNING: "Qarzdor",
  CRITICAL: "E’tibor kerak",
};

const statusTones: Record<ExecutiveHealthStatus, StatusTone> = {
  GOOD: "success",
  WARNING: "warning",
  CRITICAL: "danger",
};

export function TopClients({ clients }: { clients: TopClient[] }) {
  return (
    <DataTable label="Eng faol mijozlar">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Mijoz</DataTableHeader>
          <DataTableHeader>Jami buyurtma</DataTableHeader>
          <DataTableHeader>To‘langan</DataTableHeader>
          <DataTableHeader>Qarz</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {clients.length === 0 ? (
          <EmptyTableState colSpan={5} title="Mijozlar bo‘yicha ma’lumot yo‘q" description="Hozircha tizim bu ro‘yxat uchun ma’lumot qaytarmadi." />
        ) : (
          clients.map((client) => (
            <DataTableRow key={client.clientId}>
              <DataTableCell className="font-semibold">{client.clientName}</DataTableCell>
              <DataTableCell>{client.totalOrders} so‘m</DataTableCell>
              <DataTableCell>{client.totalPaid} so‘m</DataTableCell>
              <DataTableCell>{client.debt} so‘m</DataTableCell>
              <DataTableCell>
                <StatusBadge tone={statusTones[client.debtStatus]}>
                  {statusLabels[client.debtStatus]}
                </StatusBadge>
              </DataTableCell>
            </DataTableRow>
          ))
        )}
      </tbody>
    </DataTable>
  );
}
