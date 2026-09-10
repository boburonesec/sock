import { ChevronRight } from "lucide-react";
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

/**
 * Mobile card for one client. Phone/address are the fields a seller
 * actually needs to scan for (who is this, how do I reach them) — notes
 * stay in the detail drawer rather than on every card. Whole card is the
 * tap target: the desktop table already treats the row as a single
 * navigation-to-drawer action (same onSelect), so this reuses that
 * existing interaction rather than inventing a new one.
 */
export function ClientCard({
  client,
  onSelect,
}: {
  client: Client;
  onSelect: (client: Client) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(client)}
      className="flex w-full min-h-[44px] items-start justify-between gap-3 rounded-xl border border-border/70 bg-card/40 p-4 text-left transition-colors hover:border-primary/40 active:bg-muted/40"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate font-semibold" title={client.name}>
            {client.name}
          </span>
          <StatusBadge tone={statusTone[client.status] ?? "neutral"} className="shrink-0">
            {statusLabel[client.status] ?? client.status}
          </StatusBadge>
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {client.phone ?? "Telefon ko‘rsatilmagan"}
        </p>
        {client.address ? (
          <p className="truncate text-xs text-muted-foreground">{client.address}</p>
        ) : null}
      </div>
      <ChevronRight className="mt-1 shrink-0 text-muted-foreground" size={18} aria-hidden="true" />
    </button>
  );
}
