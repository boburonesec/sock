import {
  formatStockMovementReason,
  formatStockUnit,
  formatWarehouseZoneName,
  labelStatus,
  stockMovementTypeLabel,
} from "@paypoq/shared";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { movementItemName, movementTone } from "@/features/warehouse/format";
import { useStockMovementsQuery } from "@/lib/api/warehouse";
import { routes } from "@/lib/routes";
import { SelectField } from "@/shared/ui/controls";
import { Badge } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { ListRow, SearchInput } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatDateTime, formatQuantity } from "@/shared/utils/format";

export default function MovementsRoute() {
  return (
    <AreaGuard area="warehouse" backTo={routes.warehouse} title="Kirim-chiqim">
      <Movements />
    </AreaGuard>
  );
}

function Movements() {
  const router = useRouter();
  const movementsQuery = useStockMovementsQuery();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const all = useMemo(() => movementsQuery.data ?? [], [movementsQuery.data]);
  // Offer only the movement types present in the list the API returned.
  const typeOptions = Array.from(new Set(all.map((movement) => movement.movementType))).map((type) => ({
    value: type,
    label: labelStatus(stockMovementTypeLabel, type),
  }));
  const term = search.trim().toLowerCase();
  const movements = useMemo(
    () =>
      all.filter(
        (movement) =>
          (!typeFilter || movement.movementType === typeFilter) &&
          (!term ||
            `${movementItemName(movement)} ${movement.zone.name} ${movement.recordedBy.name}`
              .toLowerCase()
              .includes(term)),
      ),
    [all, term, typeFilter],
  );

  return (
    <Screen
      backTo={routes.warehouse}
      eyebrow="Ombor"
      onRefresh={() => void movementsQuery.refetch()}
      refreshing={movementsQuery.isRefetching}
      subtitle="So'nggi ombor harakatlari. Har bir tuzatish sabab bilan audit qilinadi."
      title="Kirim-chiqim"
    >
      <QueryState queries={[movementsQuery]}>
        <SearchInput onChangeText={setSearch} placeholder="Mahsulot, material yoki mas'ul" value={search} />
        <SelectField
          clearLabel="Barcha turlar"
          label="Harakat turi"
          onChange={setTypeFilter}
          options={typeOptions}
          placeholder="Barcha turlar"
          value={typeFilter}
        />

        {movements.length === 0 ? (
          <EmptyState
            description={
              term || typeFilter
                ? "Filtrga mos harakat topilmadi."
                : "Kirim, chiqim yoki tuzatish qayd etilgach shu yerda ko'rinadi."
            }
            title="Ombor harakatlari yo'q"
          />
        ) : null}

        {movements.map((movement) => {
          const reasonText = movement.reason
            ? formatStockMovementReason(movement.reason)
            : movement.note;

          return (
            <ListRow
              badge={
                <Badge
                  label={labelStatus(stockMovementTypeLabel, movement.movementType)}
                  tone={movementTone[movement.movementType] ?? "info"}
                />
              }
              key={movement.id}
              meta={`${movement.recordedBy.name}${reasonText ? ` · ${reasonText}` : ""}`}
              onPress={() =>
                router.push({
                  pathname: "/(app)/operations/warehouse/movement/[id]",
                  params: { id: movement.id },
                })
              }
              subtitle={`${formatWarehouseZoneName(movement.zone.name)} · ${formatDateTime(movement.occurredAt)}`}
              title={movementItemName(movement)}
              value={formatQuantity(movement.quantity, formatStockUnit(movement.unit))}
            />
          );
        })}
      </QueryState>
    </Screen>
  );
}
