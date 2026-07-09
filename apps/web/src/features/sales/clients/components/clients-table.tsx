import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { Client } from "@/lib/api/sales";

const statusTone: Record<string, StatusTone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
};

export function ClientsTable({
  clients,
  onSelect,
}: {
  clients: Client[];
  onSelect: (client: Client) => void;
}) {
  return (
    <DataTable label="Mijozlar ro‘yxati">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Mijoz</DataTableHeader>
          <DataTableHeader>Telefon</DataTableHeader>
          <DataTableHeader>Manzil</DataTableHeader>
          <DataTableHeader>Izoh</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {clients.length > 0 ? (
          clients.map((client) => (
            <DataTableRow key={client.id} className="hover:bg-muted/40">
              <DataTableCell>
                <button
                  onClick={() => onSelect(client)}
                  className="text-left font-semibold hover:text-primary"
                >
                  {client.name}
                </button>
              </DataTableCell>
              <DataTableCell>{client.phone ?? "—"}</DataTableCell>
              <DataTableCell>{client.address ?? "—"}</DataTableCell>
              <DataTableCell className="max-w-72 truncate">
                {client.notes ?? "—"}
              </DataTableCell>
              <DataTableCell>
                <StatusBadge tone={statusTone[client.status] ?? "neutral"}>
                  {statusLabel[client.status] ?? client.status}
                </StatusBadge>
              </DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={5}
            title="Mijozlar mavjud emas"
            description="Mijoz qo‘shilgach, ular shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
