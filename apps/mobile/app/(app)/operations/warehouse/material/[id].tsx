import {
  formatStockUnit,
  formatWarehouseZoneName,
  labelStatus,
  stockMovementTypeLabel,
} from "@paypoq/shared";
import { useLocalSearchParams, useRouter } from "expo-router";

import { movementTone } from "@/features/warehouse/format";
import { useAccess } from "@/lib/access/use-access";
import { useMaterialStockQuery, useStockMovementsQuery } from "@/lib/api/warehouse";
import { routes } from "@/lib/routes";
import { Button } from "@/shared/ui/controls";
import { Badge } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Card, KeyValueList, ListRow, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatDateTime, formatQuantity } from "@/shared/utils/format";

export default function MaterialDetailRoute() {
  return (
    <AreaGuard area="warehouse" backTo={routes.warehouseMaterials} title="Material">
      <MaterialDetail />
    </AreaGuard>
  );
}

function MaterialDetail() {
  const router = useRouter();
  const access = useAccess();
  const { id } = useLocalSearchParams<{ id: string }>();
  const stockQuery = useMaterialStockQuery();
  const movementsQuery = useStockMovementsQuery();
  const stock = (stockQuery.data ?? []).find((item) => item.id === id);
  // Movements of this material in this zone, from the same list Web shows.
  const movements = (movementsQuery.data ?? []).filter(
    (movement) => movement.material?.id === stock?.material.id && movement.zone.id === stock?.zone.id,
  );

  return (
    <Screen
      backTo={routes.warehouseMaterials}
      eyebrow="Material"
      footer={
        stock && access.can("warehouseCreateMaterialReceipt") ? (
          <Button
            icon="download-outline"
            label="Material qabul qilish"
            onPress={() =>
              router.push({
                pathname: routes.warehouseReceiveMaterial,
                params: { materialId: stock.material.id, zoneId: stock.zone.id },
              })
            }
          />
        ) : undefined
      }
      onRefresh={() => {
        void stockQuery.refetch();
        void movementsQuery.refetch();
      }}
      refreshing={stockQuery.isRefetching || movementsQuery.isRefetching}
      title={stock?.material.name ?? "Material"}
    >
      <QueryState queries={[stockQuery, movementsQuery]}>
        {!stock ? (
          <EmptyState
            description="Qoldiq yozuvi topilmadi. Ro'yxatni yangilab qayta urining."
            title="Material topilmadi"
          />
        ) : (
          <>
            <Card tone="accent">
              <KeyValueList
                items={[
                  {
                    label: "Joriy qoldiq",
                    value: formatQuantity(stock.quantity, formatStockUnit(stock.unit)),
                  },
                  { label: "Ombor", value: formatWarehouseZoneName(stock.warehouse.name) },
                  { label: "Zona", value: formatWarehouseZoneName(stock.zone.name) },
                  { label: "Oxirgi yangilanish", value: formatDateTime(stock.updatedAt) },
                ]}
              />
            </Card>

            <Section description="Shu zona bo'yicha oxirgi yozuvlar." title="So'nggi harakatlar">
              {movements.length === 0 ? (
                <EmptyState
                  description="Bu material uchun so'nggi harakatlar ro'yxatida yozuv yo'q."
                  title="Harakat yo'q"
                />
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
                  title={formatQuantity(movement.quantity, formatStockUnit(movement.unit))}
                />
              ))}
            </Section>
          </>
        )}
      </QueryState>
    </Screen>
  );
}
