import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { useAccess } from "@/lib/access/use-access";
import { useOperationsSummaryQuery, useStageInventoryQuery } from "@/lib/api/production";
import { routes } from "@/lib/routes";
import { Button } from "@/shared/ui/controls";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { ListRow, SearchInput, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatDateTime, formatQuantity } from "@/shared/utils/format";

export default function StageBreakdownRoute() {
  return (
    <AreaGuard area="production" backTo={routes.production} title="Bosqich tarkibi">
      <StageBreakdown />
    </AreaGuard>
  );
}

function StageBreakdown() {
  const router = useRouter();
  const access = useAccess();
  const { stageId } = useLocalSearchParams<{ stageId: string }>();
  const summaryQuery = useOperationsSummaryQuery();
  const inventoryQuery = useStageInventoryQuery();
  const [search, setSearch] = useState("");
  const stage = summaryQuery.data?.stageTotals.find((item) => item.stageId === stageId);
  const items = useMemo(() => {
    const term = search.trim().toLowerCase();

    return (inventoryQuery.data ?? [])
      .filter((item) => item.stage.id === stageId)
      .filter((item) => {
        if (!term) return true;
        const variant = item.productVariant;
        return `${variant.product.name} ${variant.color.name} ${variant.material.name} ${variant.season.name}`
          .toLowerCase()
          .includes(term);
      });
  }, [inventoryQuery.data, search, stageId]);

  return (
    <Screen
      backTo={routes.production}
      eyebrow="Bosqich tarkibi"
      footer={
        access.can("productionCreateStageMovement") && stage ? (
          <Button
            icon="swap-horizontal-outline"
            label="Keyingi bosqichga o'tkazish"
            onPress={() =>
              router.push({ pathname: routes.productionMove, params: { stageId: stage.stageId } })
            }
          />
        ) : undefined
      }
      onRefresh={() => {
        void summaryQuery.refetch();
        void inventoryQuery.refetch();
      }}
      refreshing={summaryQuery.isRefetching || inventoryQuery.isRefetching}
      subtitle={
        stage ? `Bosqichda jami ${formatQuantity(stage.quantity, "dona")} mavjud.` : undefined
      }
      title={stage?.stageName ?? "Bosqich"}
    >
      <QueryState queries={[summaryQuery, inventoryQuery]}>
        {!stage ? (
          <EmptyState
            description="Bosqich o'chirilgan yoki boshqa fabrikaga tegishli."
            title="Bosqich topilmadi"
          />
        ) : (
          <Section
            description="Rang, material va mavsum bo'yicha"
            title="Mahsulot tarkibi"
          >
            <SearchInput onChangeText={setSearch} placeholder="Mahsulot yoki rang" value={search} />
            {items.length === 0 ? (
              <EmptyState
                description={
                  search
                    ? "Qidiruvga mos mahsulot topilmadi."
                    : "Bu bosqichda hozircha mahsulot yo'q."
                }
                title="Mahsulot mavjud emas"
              />
            ) : null}
            {items.map((item) => (
              <ListRow
                key={item.id}
                meta={`Yangilangan: ${formatDateTime(item.updatedAt)}`}
                subtitle={`${item.productVariant.color.name} · ${item.productVariant.material.name} · ${item.productVariant.season.name}`}
                title={item.productVariant.product.name}
                value={formatQuantity(item.quantity, "dona")}
              />
            ))}
          </Section>
        )}
      </QueryState>
    </Screen>
  );
}
