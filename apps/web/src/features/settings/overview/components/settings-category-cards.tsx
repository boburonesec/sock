import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { InfoCard } from "@/components/cards/info-card";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { SettingsOverview, SettingsOverviewStatus } from "@/lib/api/settings";
import { formatDateShort } from "@/lib/format";

type SettingsCategory = SettingsOverview["categoryCards"][number];

const statusTone: Record<SettingsOverviewStatus, StatusTone> = {
  CONFIGURED: "success",
  NEEDS_ATTENTION: "warning",
};

const statusLabel: Record<SettingsOverviewStatus, string> = {
  CONFIGURED: "Sozlangan",
  NEEDS_ATTENTION: "E’tibor kerak",
};

export function SettingsCategoryCards({
  categories,
}: {
  categories: SettingsCategory[];
}) {
  if (categories.length === 0) {
    return (
      <EmptyState
        title="Sozlama kategoriyalari yo‘q"
        description="Hozircha asosiy ma’lumot bo‘limlari topilmadi."
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
          <div className="mt-4 flex items-end justify-between gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Soni</p>
              <p className="font-semibold">{category.count}</p>
            </div>
            {category.updatedAt ? (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Oxirgi o‘zgarish</p>
                <p className="text-muted-foreground">{formatDateShort(category.updatedAt)}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Hali o‘zgartirilmagan</p>
            )}
          </div>
          <Link
            href={category.href}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Ro‘yxatni ochish <ArrowRight size={15} />
          </Link>
        </InfoCard>
      ))}
    </div>
  );
}
