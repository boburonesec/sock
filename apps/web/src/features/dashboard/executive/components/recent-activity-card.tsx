import type { ExecutiveSummary } from "@/lib/api/dashboard";
import { formatDateTimeForUser } from "@/lib/format";
import { formatVisibleStatusText } from "@/lib/status-labels";

type RecentActivityItem = ExecutiveSummary["recentActivity"][number];

const typeLabels: Record<RecentActivityItem["type"], string> = {
  ORDER: "Buyurtma",
  EXPENSE: "Xarajat",
};

/**
 * Mobile card for one recent-activity entry. Read-only event feed (no
 * click interaction on desktop either). The record's own title (already a
 * human business reference — order number or expense category, never a
 * raw id) leads with its type as a small badge-like label, the
 * description follows, and the timestamp stays small since it's
 * secondary to *what* happened.
 */
export function RecentActivityCard({ item }: { item: RecentActivityItem }) {
  return (
    <div className="min-h-[44px] space-y-1.5 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-semibold" title={item.title}>
          {item.title}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{typeLabels[item.type]}</span>
      </div>
      <p className="text-sm text-muted-foreground">{formatVisibleStatusText(item.description)}</p>
      <p className="text-xs text-muted-foreground">{formatDateTimeForUser(item.occurredAt)}</p>
    </div>
  );
}
