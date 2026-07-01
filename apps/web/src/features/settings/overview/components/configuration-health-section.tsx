import { InfoCard } from "@/components/cards/info-card";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { SettingsOverview, SettingsOverviewStatus } from "@/lib/api/settings";

type ConfigurationHealth = SettingsOverview["configurationHealth"][number];

const statusTone: Record<SettingsOverviewStatus, StatusTone> = {
  CONFIGURED: "success",
  NEEDS_ATTENTION: "warning",
};

const statusLabel: Record<SettingsOverviewStatus, string> = {
  CONFIGURED: "Tayyor",
  NEEDS_ATTENTION: "E’tibor kerak",
};

export function ConfigurationHealthSection({
  items,
}: {
  items: ConfigurationHealth[];
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Configuration health mavjud emas"
        description="Backend configurationHealth bo‘sh ro‘yxat qaytardi."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <InfoCard
          key={item.id}
          title={item.label}
          action={
            <StatusBadge tone={statusTone[item.status]}>
              {statusLabel[item.status]}
            </StatusBadge>
          }
        >
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </InfoCard>
      ))}
    </div>
  );
}
