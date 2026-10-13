import { formatWarehouseZoneName } from "@paypoq/shared";
import { useRouter } from "expo-router";

import { zoneStatus } from "@/features/warehouse/format";
import { useWarehouseSummaryQuery } from "@/lib/api/warehouse";
import { routes } from "@/lib/routes";
import { KpiGrid } from "@/shared/ui/dashboard";
import { Badge } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { ListRow, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatQuantity } from "@/shared/utils/format";

export default function ZonesRoute() {
  return (
    <AreaGuard area="warehouse" backTo={routes.warehouse} title="Zonalar">
      <Zones />
    </AreaGuard>
  );
}

function Zones() {
  const router = useRouter();
  const summaryQuery = useWarehouseSummaryQuery();
  const summary = summaryQuery.data;

  return (
    <Screen
      backTo={routes.warehouse}
      eyebrow="Ombor"
      onRefresh={() => void summaryQuery.refetch()}
      refreshing={summaryQuery.isRefetching}
      subtitle="Har bir filial bitta asosiy ombor bilan ishlaydi."
      title="Zonalar"
    >
      <QueryState queries={[summaryQuery]}>
        {summary ? (
          <>
            <KpiGrid
              items={[
                { label: "Jami zonalar", value: formatQuantity(summary.kpis.warehouseZoneCount, "ta") },
                {
                  label: "Tayyor mahsulot",
                  value: formatQuantity(summary.kpis.finishedProductQuantity, "dona"),
                },
                {
                  label: "Material yozuvlari",
                  value: formatQuantity(summary.kpis.materialRecordCount, "ta"),
                },
                {
                  label: "Past qoldiq",
                  value: formatQuantity(summary.kpis.lowStockMaterialCount, "ta"),
                  tone: summary.kpis.lowStockMaterialCount === "0" ? "default" : "warning",
                },
              ]}
            />

            <Section title="Asosiy ombor zonalari">
              {summary.zoneSummaries.length === 0 ? (
                <EmptyState
                  description="Zonalar sozlangandan keyin ular shu yerda ko'rinadi."
                  title="Ombor zonalari mavjud emas"
                />
              ) : null}
              {summary.zoneSummaries.map((zone) => {
                const status = zoneStatus[zone.status];

                return (
                  <ListRow
                    badge={
                      <Badge label={status?.label ?? zone.status} tone={status?.tone ?? "info"} />
                    }
                    key={zone.zoneId}
                    meta={`${zone.productRecordCount} mahsulot · ${zone.materialRecordCount} material yozuvi`}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/operations/warehouse/zone/[id]",
                        params: { id: zone.zoneId },
                      })
                    }
                    subtitle={formatWarehouseZoneName(zone.warehouseName)}
                    title={formatWarehouseZoneName(zone.zoneName)}
                    value={formatQuantity(zone.productQuantity, "dona")}
                  />
                );
              })}
            </Section>
          </>
        ) : null}
      </QueryState>
    </Screen>
  );
}
