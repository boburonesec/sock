import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { InfoCard } from "@/components/cards/info-card";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { SettingsOverview, SettingsOverviewStatus } from "@/lib/api/settings";

type SettingsCategory = SettingsOverview["categoryCards"][number];

const statusTone: Record<SettingsOverviewStatus, StatusTone> = {
  CONFIGURED: "success",
  NEEDS_ATTENTION: "warning",
};

const statusLabel: Record<SettingsOverviewStatus, string> = {
  CONFIGURED: "Sozlangan",
  NEEDS_ATTENTION: "E’tibor kerak",
};

const dateFormatter = new Intl.DateTimeFormat("uz-UZ", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function SettingsCategoryCards({
  categories,
}: {
  categories: SettingsCategory[];
}) {
  if (categories.length === 0) {
    return (
      <EmptyState
        title="Sozlama kategoriyalari yo‘q"
        description="Tizim categoryCards bo‘sh ro‘yxat qaytardi."
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
            <span className="font-semibold">{category.count}</span>
            <span className="text-muted-foreground">
              {category.updatedAt
                ? dateFormatter.format(new Date(category.updatedAt))
                : "Hali yangilanmagan"}
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
