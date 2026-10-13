import { formatStockUnit, formatWarehouseZoneName } from "@paypoq/shared";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { formatLocation } from "@/features/warehouse/format";
import { useAccess } from "@/lib/access/use-access";
import {
  useMaterialStockQuery,
  useProductStockQuery,
  useWarehouseSummaryQuery,
} from "@/lib/api/warehouse";
import { routes } from "@/lib/routes";
import { KpiGrid } from "@/shared/ui/dashboard";
import { Segmented } from "@/shared/ui/controls";
import { Badge, Banner } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { ActionTile, ListRow, SearchInput, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatQuantity } from "@/shared/utils/format";

type StockTab = "products" | "materials";

export default function WarehouseOverviewRoute() {
  return (
    <AreaGuard area="warehouse" backTo={routes.operations} title="Ombor">
      <WarehouseOverview />
    </AreaGuard>
  );
}

function WarehouseOverview() {
  const router = useRouter();
  const access = useAccess();
  const summaryQuery = useWarehouseSummaryQuery();
  const stockQuery = useProductStockQuery();
  const materialStockQuery = useMaterialStockQuery();
  const [tab, setTab] = useState<StockTab>("products");
  const [search, setSearch] = useState("");
  const summary = summaryQuery.data;
  const canWrite = access.can("warehouseCreateStockCorrection");
  const term = search.trim().toLowerCase();

  const productStock = useMemo(
    () =>
      (stockQuery.data ?? []).filter((item) =>
        term
          ? `${item.productVariant.product.name} ${item.productVariant.color.name} ${item.productVariant.material.name} ${item.productVariant.season.name}`
              .toLowerCase()
              .includes(term)
          : true,
      ),
    [stockQuery.data, term],
  );
  const materialStock = useMemo(
    () =>
      (materialStockQuery.data ?? []).filter((item) =>
        term ? item.material.name.toLowerCase().includes(term) : true,
      ),
    [materialStockQuery.data, term],
  );

  return (
    <Screen
      backTo={routes.operations}
      eyebrow="Amallar"
      onRefresh={() => {
        void summaryQuery.refetch();
        void stockQuery.refetch();
        void materialStockQuery.refetch();
      }}
      refreshing={
        summaryQuery.isRefetching || stockQuery.isRefetching || materialStockQuery.isRefetching
      }
      title="Ombor"
    >
      <QueryState queries={[summaryQuery, stockQuery, materialStockQuery]}>
        {summary ? (
          <>
            <KpiGrid
              items={[
                {
                  label: "Tayyor mahsulotlar",
                  value: formatQuantity(summary.kpis.finishedProductQuantity, "dona"),
                },
                {
                  label: "Xomashyo yozuvlari",
                  value: formatQuantity(summary.kpis.materialRecordCount, "ta"),
                },
                {
                  label: "Past qoldiq materiallar",
                  value: formatQuantity(summary.kpis.lowStockMaterialCount, "ta"),
                  tone: summary.kpis.lowStockMaterialCount === "0" ? "default" : "warning",
                },
                {
                  label: "Ombor zonalari",
                  value: formatQuantity(summary.kpis.warehouseZoneCount, "ta"),
                },
              ]}
            />

            <Section title="Bo'limlar">
              {access.can("warehouseCreateMaterialReceipt") ? (
                <ActionTile
                  icon="download-outline"
                  onPress={() => router.push(routes.warehouseReceiveMaterial)}
                  primary
                  subtitle="Xomashyo kirimi qoldiqni oshiradi"
                  title="Material qabul qilish"
                />
              ) : null}
              {canWrite ? (
                <ActionTile
                  icon="create-outline"
                  onPress={() => router.push(routes.warehouseCorrect)}
                  subtitle="Fizik sanoq natijasini sabab bilan kiritish"
                  title="Qoldiqni tuzatish"
                />
              ) : null}
              <ActionTile
                icon="layers-outline"
                onPress={() => router.push(routes.warehouseMaterials)}
                subtitle="Xomashyo qoldig'i va tafsilotlari"
                title="Materiallar"
              />
              <ActionTile
                icon="swap-vertical-outline"
                onPress={() => router.push(routes.warehouseMovements)}
                subtitle="Kirim, chiqim va tuzatishlar tarixi"
                title="Kirim-chiqim"
              />
              <ActionTile
                icon="grid-outline"
                onPress={() => router.push(routes.warehouseZones)}
                subtitle="Zonalar bo'yicha qoldiq va harakatlar"
                title="Zonalar"
              />
            </Section>

            {!canWrite ? (
              <Banner
                message="Siz faqat qoldiqni ko'rasiz. Kirim va tuzatish — omborchi yoki menejer."
                tone="info"
              />
            ) : null}

            <Section
              description="Belgilangan limit bo'yicha aniqlangan materiallar."
              title="Past qoldiq materiallar"
            >
              {summary.lowStockMaterials.length === 0 ? (
                <EmptyState
                  description="Limitdan past qolgan material yo'q."
                  title="Hammasi me'yorda"
                />
              ) : null}
              {summary.lowStockMaterials.map((material) => (
                <ListRow
                  badge={<Badge label="Kam qoldi" tone="warning" />}
                  key={`${material.warehouseId}:${material.materialId}`}
                  meta={formatWarehouseZoneName(material.warehouseName)}
                  subtitle={`Limit: ${formatQuantity(material.threshold, material.unit)}`}
                  title={material.materialName}
                  value={formatQuantity(material.quantity, material.unit)}
                />
              ))}
            </Section>

            <Section description="Zona bo'yicha hozirgi qoldiq." title="Qoldiqlar">
              <Segmented
                onChange={setTab}
                options={[
                  { value: "products", label: "Tayyor mahsulot" },
                  { value: "materials", label: "Xomashyo" },
                ]}
                value={tab}
              />
              <SearchInput
                onChangeText={setSearch}
                placeholder={tab === "products" ? "Mahsulot yoki rang" : "Material"}
                value={search}
              />

              {tab === "products" ? (
                <>
                  {productStock.length === 0 ? (
                    <EmptyState
                      description={
                        term
                          ? "Qidiruvga mos mahsulot topilmadi."
                          : "Tayyor mahsulot omborga qabul qilingach shu yerda ko'rinadi."
                      }
                      title="Qoldiq mavjud emas"
                    />
                  ) : null}
                  {productStock.map((item) => (
                    <ListRow
                      key={item.id}
                      meta={formatLocation(item.warehouse, item.zone)}
                      subtitle={`${item.productVariant.color.name} · ${item.productVariant.material.name} · ${item.productVariant.season.name}`}
                      title={item.productVariant.product.name}
                      value={formatQuantity(item.quantity, "dona")}
                    />
                  ))}
                </>
              ) : (
                <>
                  {materialStock.length === 0 ? (
                    <EmptyState
                      description={
                        term
                          ? "Qidiruvga mos material topilmadi."
                          : "Material qabul qilingach shu yerda ko'rinadi."
                      }
                      title="Qoldiq mavjud emas"
                    />
                  ) : null}
                  {materialStock.map((item) => (
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
                </>
              )}
            </Section>
          </>
        ) : null}
      </QueryState>
    </Screen>
  );
}
