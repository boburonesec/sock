import { useMemo, useState } from "react";
import { View } from "react-native";

import {
  CorrectionRequestSheet,
  type CorrectionTarget,
} from "@/features/production/correction-request-sheet";
import { useAccess } from "@/lib/access/use-access";
import { useRecentMovementsQuery, useWorkerActivitiesQuery } from "@/lib/api/production";
import { routes } from "@/lib/routes";
import { Button, Segmented } from "@/shared/ui/controls";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { ListRow, SearchInput } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatDateTime, formatQuantity } from "@/shared/utils/format";

type HistoryTab = "movements" | "activities";

/** Web shows the latest 20 worker activities on the board. */
const ACTIVITY_LIMIT = 20;

export default function ProductionHistoryRoute() {
  return (
    <AreaGuard area="production" backTo={routes.production} title="Oxirgi harakatlar">
      <ProductionHistory />
    </AreaGuard>
  );
}

function ProductionHistory() {
  const access = useAccess();
  const movementsQuery = useRecentMovementsQuery();
  const activitiesQuery = useWorkerActivitiesQuery();
  const [tab, setTab] = useState<HistoryTab>("movements");
  const [search, setSearch] = useState("");
  const [correctionTarget, setCorrectionTarget] = useState<CorrectionTarget | null>(null);
  const canRequestCorrection = access.can("recoveryCreateProductionCorrection");
  const term = search.trim().toLowerCase();

  const movements = useMemo(
    () =>
      (movementsQuery.data ?? []).filter((movement) =>
        term
          ? `${movement.sourceStage.name} ${movement.destinationStage.name} ${movement.productVariant.product.name} ${movement.productVariant.color.name} ${movement.recordedBy.name}`
              .toLowerCase()
              .includes(term)
          : true,
      ),
    [movementsQuery.data, term],
  );
  const activities = useMemo(
    () =>
      (activitiesQuery.data ?? [])
        .slice(0, ACTIVITY_LIMIT)
        .filter((activity) =>
          term
            ? `${activity.employee.name} ${activity.stage.name} ${activity.productVariant.product.name} ${activity.productVariant.color.name}`
                .toLowerCase()
                .includes(term)
            : true,
        ),
    [activitiesQuery.data, term],
  );

  const reportButton = (target: CorrectionTarget) =>
    canRequestCorrection ? (
      <View>
        <Button
          icon="flag-outline"
          label="Xatoni bildirish"
          onPress={() => setCorrectionTarget(target)}
          variant="secondary"
        />
      </View>
    ) : undefined;

  return (
    <Screen
      backTo={routes.production}
      eyebrow="Ishlab chiqarish"
      onRefresh={() => {
        void movementsQuery.refetch();
        void activitiesQuery.refetch();
      }}
      refreshing={movementsQuery.isRefetching || activitiesQuery.isRefetching}
      subtitle="Yozuvlar o'zgartirilmaydi — xato bo'lsa, tuzatish so'rovi yuboriladi."
      title="Oxirgi harakatlar"
    >
      <Segmented
        onChange={setTab}
        options={[
          { value: "movements", label: "Bosqich o'tkazishlari" },
          { value: "activities", label: "Ishchi faoliyati" },
        ]}
        value={tab}
      />
      <SearchInput onChangeText={setSearch} placeholder="Bosqich, mahsulot yoki ishchi" value={search} />

      {tab === "movements" ? (
        <QueryState queries={[movementsQuery]}>
          {movements.length === 0 ? (
            <EmptyState
              description={
                term
                  ? "Qidiruvga mos o'tkazish topilmadi."
                  : "Bosqichlar orasidagi mahsulot o'tishlari qayd etilgach, ular shu yerda ko'rinadi."
              }
              title="Bosqich o'tkazishlari mavjud emas"
            />
          ) : null}
          {movements.map((movement) => {
            const product = `${movement.productVariant.product.name} · ${movement.productVariant.color.name}`;
            const team =
              movement.productionBatch?.mechanic && movement.productionBatch.machineOperator
                ? `Mexanik: ${movement.productionBatch.mechanic.name} · Operator: ${movement.productionBatch.machineOperator.name}`
                : null;
            const title = `${movement.sourceStage.name} → ${movement.destinationStage.name}`;

            return (
              <ListRow
                footer={reportButton({
                  domain: "PRODUCTION_MOVEMENT",
                  sourceRecordId: movement.id,
                  title,
                  details: [
                    { label: "Mahsulot", value: product },
                    { label: "Miqdor", value: `${movement.quantity} dona` },
                  ],
                })}
                key={movement.id}
                meta={[team, `${movement.recordedBy.name} · ${formatDateTime(movement.occurredAt)}`]
                  .filter(Boolean)
                  .join("\n")}
                subtitle={product}
                title={title}
                value={formatQuantity(movement.quantity, "dona")}
              />
            );
          })}
        </QueryState>
      ) : (
        <QueryState queries={[activitiesQuery]}>
          {activities.length === 0 ? (
            <EmptyState
              description={
                term ? "Qidiruvga mos yozuv topilmadi." : "Ishchi faoliyati yozuvlari yo'q."
              }
              title="Ishchi faoliyati yo'q"
            />
          ) : null}
          {activities.map((activity) => {
            const product = `${activity.productVariant.product.name} · ${activity.productVariant.color.name}`;
            const title = `${activity.employee.name} · ${activity.stage.name}`;

            return (
              <ListRow
                footer={reportButton({
                  domain: "WORKER_ACTIVITY",
                  sourceRecordId: activity.id,
                  title,
                  details: [
                    { label: "Mahsulot", value: product },
                    { label: "Miqdor", value: `${activity.quantity} dona` },
                  ],
                })}
                key={activity.id}
                meta={formatDateTime(activity.activityDate)}
                subtitle={product}
                title={title}
                value={formatQuantity(activity.quantity, "dona")}
              />
            );
          })}
        </QueryState>
      )}

      <CorrectionRequestSheet onClose={() => setCorrectionTarget(null)} target={correctionTarget} />
    </Screen>
  );
}
