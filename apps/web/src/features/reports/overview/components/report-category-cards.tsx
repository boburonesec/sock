import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { InfoCard } from "@/components/cards/info-card";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { ReportOverviewStatus, ReportsOverview } from "@/lib/api/reports";

type ReportCategory = ReportsOverview["categoryCards"][number];

const statusTone: Record<ReportOverviewStatus, StatusTone> = {
  AVAILABLE: "success",
  COMING_SOON: "warning",
};

const statusLabel: Record<ReportOverviewStatus, string> = {
  AVAILABLE: "Tayyor",
  COMING_SOON: "Keyingi bosqich",
};

const dateFormatter = new Intl.DateTimeFormat("uz-UZ", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function ReportCategoryCards({
  categories,
}: {
  categories: ReportCategory[];
}) {
  if (categories.length === 0) {
    return (
      <EmptyState
        title="Hisobot kategoriyalari yo‘q"
        description="Backend categoryCards bo‘sh ro‘yxat qaytardi."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {categories.map((category) => (
        <InfoCard
          key={category.id}
          title={category.name}
          action={
            <StatusBadge tone={statusTone[category.status]}>
              {statusLabel[category.status]}
            </StatusBadge>
          }
        >
          <p className="text-sm text-muted-foreground">{category.description}</p>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="font-semibold">{category.reportCount}</span>
            <span className="text-muted-foreground">
              {category.lastUpdatedAt
                ? dateFormatter.format(new Date(category.lastUpdatedAt))
                : "Metadata"}
            </span>
          </div>
          <Link
            href={category.href}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Ko‘rish <ArrowRight size={15} />
          </Link>
        </InfoCard>
      ))}
    </div>
  );
}
