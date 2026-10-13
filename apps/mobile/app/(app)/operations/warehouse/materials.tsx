import { formatStockUnit } from "@paypoq/shared";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { formatLocation } from "@/features/warehouse/format";
import { useAccess } from "@/lib/access/use-access";
import { useMaterialStockQuery } from "@/lib/api/warehouse";
import { routes } from "@/lib/routes";
import { KpiGrid } from "@/shared/ui/dashboard";
import { Button } from "@/shared/ui/controls";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { ListRow, SearchInput } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatQuantity } from "@/shared/utils/format";

export default function MaterialsRoute() {
  return (
    <AreaGuard area="warehouse" backTo={routes.warehouse} title="Materiallar">
      <Materials />
    </AreaGuard>
  );
}

function Materials() {
  const router = useRouter();
  const access = useAccess();
  const stockQuery = useMaterialStockQuery();
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const materials = useMemo(
    () =>
      (stockQuery.data ?? []).filter((item) =>
        term
          ? `${item.material.name} ${item.zone.name} ${item.warehouse.name}`.toLowerCase().includes(term)
          : true,
      ),
    [stockQuery.data, term],
  );

  return (
    <Screen
      backTo={routes.warehouse}
      eyebrow="Ombor"
      footer={
        access.can("warehouseCreateMaterialReceipt") ? (
          <Button
            icon="download-outline"
            label="Material qabul qilish"
            onPress={() => router.push(routes.warehouseReceiveMaterial)}
          />
        ) : undefined
      }
      onRefresh={() => void stockQuery.refetch()}
      refreshing={stockQuery.isRefetching}
      subtitle="Barcha xomashyo materiallari va ularning ombordagi qoldig'i."
      title="Materiallar"
    >
      <QueryState queries={[stockQuery]}>
        <KpiGrid
          items={[
            {
              label: "Material qoldiq yozuvlari",
              value: formatQuantity(stockQuery.data?.length ?? 0, "ta"),
            },
          ]}
        />
        <SearchInput onChangeText={setSearch} placeholder="Material yoki zona" value={search} />

        {materials.length === 0 ? (
          <EmptyState
            description={
              term
                ? "Qidiruvga mos material topilmadi."
                : "Material qabul qilingach qoldiq shu yerda ko'rinadi."
            }
            title="Material qoldig'i yo'q"
          />
        ) : null}

        {materials.map((item) => (
          <ListRow
            key={item.id}
            meta={formatLocation(item.warehouse, item.zone)}
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
      </QueryState>
    </Screen>
  );
}
