import type { AuditLogEntry } from "@/lib/api/audit";
import { formatDateTimeForUser } from "@/lib/format";
import { formatAuditAction, formatAuditEntityType } from "@/lib/status-labels";

/**
 * Mobile card for one audit log entry. Audit is traceability-critical, so
 * nothing the desktop table shows is dropped here — action, entity type,
 * actor, timestamp, and the (already-truncated-on-desktop) entity id all
 * stay, just reflowed for scanning instead of columns. No detail
 * drawer/dialog exists for this screen today (before/after/metadata are
 * never rendered anywhere, desktop included), so none is invented here
 * either — this card is read-only, matching the existing table rows.
 */
export function AuditLogCard({ log }: { log: AuditLogEntry }) {
  return (
    <div className="min-h-[44px] space-y-1.5 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-semibold" title={formatAuditAction(log.action)}>
          {formatAuditAction(log.action)}
        </span>
        <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTimeForUser(log.createdAt)}
        </span>
      </div>
      <p className="truncate text-sm text-muted-foreground">{formatAuditEntityType(log.entityType)}</p>
      <p className="truncate text-xs text-muted-foreground">
        {log.user?.name ?? "—"}
        {log.user?.email ? ` · ${log.user.email}` : ""}
      </p>
      {log.entityId ? (
        <p className="truncate text-xs text-muted-foreground/70" title={log.entityId}>
          {log.entityId}
        </p>
      ) : null}
    </div>
  );
}
