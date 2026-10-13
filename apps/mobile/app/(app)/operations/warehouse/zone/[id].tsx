import {
  formatStockUnit,
  formatWarehouseZoneName,
  labelStatus,
  stockMovementTypeLabel,
} from "@paypoq/shared";
import { useLocalSearchParams, useRouter } from "expo-router";

import { movementItemName, movementTone, zoneStatus } from "@/features/warehouse/format";
import {
  useMaterialStockQuery,
  useProductStockQuery,
  useStockMovementsQuery,
  useWarehouseSummaryQuery,
} from "@/lib/api/warehouse";
import { routes } from "@/lib/routes";
import { Badge } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Card, KeyValueList, ListRow, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatDateTime, formatQuantity } from "@/shared/utils/format";

export default function ZoneDetailRoute() {
  return (
    <AreaGuard area="warehouse" backTo={routes.warehouseZones} title="Zona">
      <ZoneDetail />
    </AreaGuard>
  );
}

function ZoneDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const summaryQuery = useWarehouseSummaryQuery();
  const stockQuery = useProductStockQuery();
  const materialStockQuery = useMaterialStockQuery();
  const movementsQuery = useStockMovementsQuery();
  const zone = summaryQuery.data?.zoneSummaries.find((item) => item.zoneId === id);
  const products = (stockQuery.data ?? []).filter((item) => item.zone.id === id);
  const materials = (materialStockQuery.data ?? []).filter((item) => item.zone.id === id);
  const movements = (movementsQuery.data ?? []).filter((item) => item.zone.id === id);
  const status = zone ? zoneStatus[zone.status] : undefined;

  return (
    <Screen
      backTo={routes.warehouseZones}
      eyebrow="Zona"
      onRefresh={() => {
        void summaryQuery.refetch();
        void stockQuery.refetch();
        void materialStockQuery.refetch();
        void movementsQuery.refetch();
      }}
      refreshing={
        summaryQuery.isRefetching ||
        stockQuery.isRefetching ||
        materialStockQuery.isRefetching ||
        movementsQuery.isRefetching
      }
      subtitle={zone ? formatWarehouseZoneName(zone.warehouseName) : undefined}
      title={zone ? formatWarehouseZoneName(zone.zoneName) : "Zona"}
    >
      <QueryState queries={[summaryQuery, stockQuery, materialStockQuery, movementsQuery]}>
        {!zone ? (
          <EmptyState description="Zona topilmadi yoki o'chirilgan." title="Zona topilmadi" />
        ) : (
          <>
            <Card tone="accent">
              <Badge label={status?.label ?? zone.status} tone={status?.tone ?? "info"} />
              <KeyValueList
                items={[
                  { label: "Mahsulot miqdori", value: formatQuantity(zone.productQuantity, "dona") },
                  { label: "Mahsulot yozuvlari", value: zone.productRecordCount },
                  { label: "Material yozuvlari", value: zone.materialRecordCount },
                ]}
              />
            </Card>

            <Section title="Mahsulot qoldig'i">
              {products.length === 0 ? (
                <EmptyState description="Bu zonada tayyor mahsulot yo'q." title="Yozuv yo'q" />
              ) : null}
              {products.map((item) => (
                <ListRow
                  key={item.id}
                  subtitle={`${item.productVariant.color.name} · ${item.productVariant.material.name} · ${item.productVariant.season.name}`}
                  title={item.productVariant.product.name}
                  value={formatQuantity(item.quantity, "dona")}
                />
              ))}
            </Section>

            <Section title="Material qoldig'i">
              {materials.length === 0 ? (
                <EmptyState description="Bu zonada material yo'q." title="Yozuv yo'q" />
              ) : null}
              {materials.map((item) => (
                <ListRow
                  key={item.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/operations/warehouse/material/[id]",
                      params: { id: item.id },
                    })
                  }
                  title={item.material.name}
                  value={formatQuantity(item.quantity, formatStockUnit(item.unit))}
                />
              ))}
            </Section>

            <Section title="So'nggi harakatlar">
              {movements.length === 0 ? (
                <EmptyState description="Bu zona bo'yicha so'nggi harakat yo'q." title="Yozuv yo'q" />
              ) : null}
              {movements.map((movement) => (
                <ListRow
                  badge={
                    <Badge
                      label={labelStatus(stockMovementTypeLabel, movement.movementType)}
                      tone={movementTone[movement.movementType] ?? "info"}
                    />
                  }
                  key={movement.id}
                  meta={`${movement.recordedBy.name} · ${formatDateTime(movement.occurredAt)}`}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/operations/warehouse/movement/[id]",
                      params: { id: movement.id },
                    })
                  }
                  title={movementItemName(movement)}
                  value={formatQuantity(movement.quantity, formatStockUnit(movement.unit))}
                />
              ))}
            </Section>
          </>
        )}
      </QueryState>
    </Screen>
  );
}
