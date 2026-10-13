import {
  formatStockMovementReason,
  formatStockUnit,
  formatVariantLabel,
  formatWarehouseZoneName,
  labelStatus,
  stockItemTypeLabel,
  stockMovementTypeLabel,
} from "@paypoq/shared";
import { useLocalSearchParams, useRouter } from "expo-router";

import { movementItemName, movementTone } from "@/features/warehouse/format";
import { useAccess } from "@/lib/access/use-access";
import { useStockMovementsQuery } from "@/lib/api/warehouse";
import { routes } from "@/lib/routes";
import { Button } from "@/shared/ui/controls";
import { Badge } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Card, KeyValueList, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatDateTime, formatQuantity } from "@/shared/utils/format";

export default function MovementDetailRoute() {
  return (
    <AreaGuard area="warehouse" backTo={routes.warehouseMovements} title="Ombor harakati">
      <MovementDetail />
    </AreaGuard>
  );
}

function MovementDetail() {
  const router = useRouter();
  const access = useAccess();
  const { id } = useLocalSearchParams<{ id: string }>();
  // The API has no single-movement endpoint; Web also reads from the recent list.
  const movementsQuery = useStockMovementsQuery();
  const movement = (movementsQuery.data ?? []).find((item) => item.id === id);
  const unit = movement ? formatStockUnit(movement.unit) : "";

  return (
    <Screen
      backTo={routes.warehouseMovements}
      eyebrow="Ombor harakati"
      footer={
        movement && access.can("warehouseCreateStockCorrection") ? (
          <Button
            icon="create-outline"
            label="Qoldiqni tuzatish"
            onPress={() => router.push(routes.warehouseCorrect)}
            variant="secondary"
          />
        ) : undefined
      }
      onRefresh={() => void movementsQuery.refetch()}
      refreshing={movementsQuery.isRefetching}
      subtitle={movement ? formatDateTime(movement.occurredAt) : undefined}
      title={movement ? labelStatus(stockMovementTypeLabel, movement.movementType) : "Harakat"}
    >
      <QueryState queries={[movementsQuery]}>
        {!movement ? (
          <EmptyState
            description="Bu harakat so'nggi yozuvlar ro'yxatida yo'q. Ro'yxatni yangilab qayta urining."
            title="Harakat topilmadi"
          />
        ) : (
          <>
            <Card tone="accent">
              <Badge
                label={labelStatus(stockMovementTypeLabel, movement.movementType)}
                tone={movementTone[movement.movementType] ?? "info"}
              />
              <KeyValueList
                items={[
                  {
                    label: "Nomi",
                    value: movement.productVariant
                      ? formatVariantLabel(movement.productVariant)
                      : movementItemName(movement),
                  },
                  { label: "Turi", value: labelStatus(stockItemTypeLabel, movement.itemType) },
                  { label: "Miqdor", value: formatQuantity(movement.quantity, unit) },
                ]}
              />
            </Card>

            <Section description="Tizim qaytargan audit qiymatlari." title="Qoldiq">
              <Card>
                <KeyValueList
                  items={[
                    {
                      label: "Oldingi qoldiq",
                      value:
                        movement.beforeQuantity === null
                          ? "Mavjud emas"
                          : formatQuantity(movement.beforeQuantity, unit),
                    },
                    {
                      label: "Keyingi qoldiq",
                      value:
                        movement.afterQuantity === null
                          ? "Mavjud emas"
                          : formatQuantity(movement.afterQuantity, unit),
                    },
                  ]}
                />
              </Card>
            </Section>

            <Section title="Joy va mas'ul">
              <Card>
                <KeyValueList
                  items={[
                    { label: "Ombor", value: formatWarehouseZoneName(movement.warehouse.name) },
                    { label: "Zona", value: formatWarehouseZoneName(movement.zone.name) },
                    { label: "Mas'ul", value: movement.recordedBy.name },
                    { label: "Vaqt", value: formatDateTime(movement.occurredAt) },
                  ]}
                />
              </Card>
            </Section>

            <Section title="Sabab / Izoh">
              <Card>
                <KeyValueList
                  items={[
                    {
                      label: "Sabab",
                      value: movement.reason ? formatStockMovementReason(movement.reason) : "—",
                    },
                    { label: "Izoh", value: movement.note ?? "Izoh kiritilmagan" },
                  ]}
                />
              </Card>
            </Section>
          </>
        )}
      </QueryState>
    </Screen>
  );
}
