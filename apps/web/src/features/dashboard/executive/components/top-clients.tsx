import { DataTable, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ResponsiveDataList } from "@/components/data-display/responsive-data-list";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { ExecutiveHealthStatus, ExecutiveSummary } from "@/lib/api/dashboard";
import { formatCurrency } from "@/lib/utils";
import { TopClientCard } from "./top-client-card";

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
    <ResponsiveDataList
      items={clients}
      getKey={(client) => client.clientId}
      renderCard={(client) => <TopClientCard client={client} />}
      ariaLabel="Eng faol mijozlar"
      emptyTitle="Mijozlar bo‘yicha ma’lumot yo‘q"
      emptyDescription="Hozircha tizim bu ro‘yxat uchun ma’lumot qaytarmadi."
    >
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
              <DataTableCell>{formatCurrency(client.totalOrders)}</DataTableCell>
              <DataTableCell>{formatCurrency(client.totalPaid)}</DataTableCell>
              <DataTableCell>{formatCurrency(client.debt)}</DataTableCell>
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
    </ResponsiveDataList>
  );
}
