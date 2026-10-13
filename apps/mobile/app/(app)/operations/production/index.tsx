import { zoneStatusLabel, type OperationsStageStatus } from "@paypoq/shared";
import { useRouter } from "expo-router";

import { useAccess } from "@/lib/access/use-access";
import { useOperationsSummaryQuery, useStageInventoryQuery } from "@/lib/api/production";
import { routes } from "@/lib/routes";
import { KpiGrid } from "@/shared/ui/dashboard";
import { Badge, Banner } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { ActionTile, ListRow, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatQuantity } from "@/shared/utils/format";

const stageTone: Record<OperationsStageStatus, "success" | "warning" | "error"> = {
  NORMAL: "success",
  ATTENTION: "warning",
  HIGH: "error",
};

export default function ProductionBoardRoute() {
  return (
    <AreaGuard area="production" backTo={routes.operations} title="Ishlab chiqarish">
      <ProductionBoard />
    </AreaGuard>
  );
}

function ProductionBoard() {
  const router = useRouter();
  const access = useAccess();
  const summaryQuery = useOperationsSummaryQuery();
  const inventoryQuery = useStageInventoryQuery();
  const summary = summaryQuery.data;
  const inventory = inventoryQuery.data ?? [];
  const canReceiveFinished = access.can("warehouseCreateFinishedProductReceipt");
  // Same rule as the Web manager queue: whoever can close a correction request.
  const canReviewCorrections =
    access.can("recoveryCorrectionRequests") &&
    (access.permissions.includes("production.approve") ||
      access.permissions.includes("expense.approve"));

  return (
    <Screen
      backTo={routes.operations}
      eyebrow="Amallar"
      onRefresh={() => {
        void summaryQuery.refetch();
        void inventoryQuery.refetch();
      }}
      refreshing={summaryQuery.isRefetching || inventoryQuery.isRefetching}
      title="Ishlab chiqarish"
    >
      <QueryState queries={[summaryQuery, inventoryQuery]}>
        {summary ? (
          <>
            <KpiGrid
              items={[
                {
                  label: "Bugungi ishlab chiqarish",
                  value: formatQuantity(summary.kpis.todayProduction, "dona"),
                },
                {
                  label: "Jarayondagi mahsulotlar",
                  value: formatQuantity(summary.kpis.totalInProgress, "dona"),
                },
                { label: "Eng band bosqich", value: summary.kpis.busiestStageName ?? "—" },
                {
                  label: "Faol ishchilar",
                  value: formatQuantity(summary.kpis.activeWorkers, "nafar"),
                },
              ]}
            />

            <Section description="Ishlab chiqarishdagi asosiy kiritish amallari" title="Tezkor amallar">
              {access.area("machines").allowed ? (
                <ActionTile
                  icon="cog-outline"
                  onPress={() => router.push(routes.machines)}
                  subtitle="Ishni boshlash va chiqqan mahsulotni qabul qilish"
                  title="Stanok ishi"
                />
              ) : null}
              {access.can("productionCreateStageMovement") ? (
                <ActionTile
                  icon="swap-horizontal-outline"
                  onPress={() => router.push(routes.productionMove)}
                  primary
                  subtitle="Ishlagan ishchilarga bajarilgan ish avtomatik yoziladi"
                  title="Keyingi bosqichga o'tkazish"
                />
              ) : null}
              {access.can("productionCreateWorkerActivity") ? (
                <ActionTile
                  icon="clipboard-outline"
                  onPress={() => router.push(routes.productionActivity)}
                  subtitle="Faqat alohida bajarilgan ish uchun"
                  title="Qo'shimcha bajarilgan ishni kiritish"
                />
              ) : null}
              {access.can("productionCreateDefect") ? (
                <ActionTile
                  icon="warning-outline"
                  onPress={() => router.push(routes.productionDefect)}
                  subtitle="Audit qilinadigan brak yozuvi"
                  title="Brak qayd qilish"
                />
              ) : null}
              {canReceiveFinished ? (
                <ActionTile
                  icon="archive-outline"
                  onPress={() => router.push(routes.productionReceive)}
                  subtitle="Tayyor mahsulotni ombor qoldig'iga o'tkazish"
                  title="Omborga qabul qilish"
                />
              ) : null}
              <ActionTile
                icon="flag-outline"
                onPress={() => router.push(routes.productionShiftClose)}
                subtitle="Tayyorlik ro'yxati, topshirish va qabul qilish"
                title="Smena yakuni"
              />
              <ActionTile
                icon="time-outline"
                onPress={() => router.push(routes.productionHistory)}
                subtitle="O'tkazishlar, ishchi faoliyati va braklar"
                title="Oxirgi harakatlar"
              />
              {canReviewCorrections ? (
                <ActionTile
                  icon="construct-outline"
                  onPress={() => router.push(routes.productionCorrections)}
                  subtitle="Xato bildirilgan yozuvlarni ko'rib chiqish"
                  title="Tuzatish so'rovlari"
                />
              ) : null}
            </Section>

            <Section
              description="Bosqichni tanlab, undagi mahsulot tarkibini ko'ring"
              title="Bosqichlar oqimi"
            >
              {summary.stageTotals.length === 0 ? (
                <EmptyState
                  description="Faol ishlab chiqarish bosqichlari sozlangandan keyin ular shu yerda ko'rinadi."
                  title="Bosqichlar mavjud emas"
                />
              ) : null}
              {summary.stageTotals.map((stage) => {
                const variantCount = inventory.filter(
                  (item) => item.stage.id === stage.stageId,
                ).length;

                return (
                  <ListRow
                    badge={
                      <Badge
                        label={zoneStatusLabel[stage.status] ?? stage.status}
                        tone={stageTone[stage.status] ?? "info"}
                      />
                    }
                    key={stage.stageId}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/operations/production/stage/[stageId]",
                        params: { stageId: stage.stageId },
                      })
                    }
                    subtitle={`${variantCount} tur mahsulot`}
                    title={stage.stageName}
                    value={formatQuantity(stage.quantity, "dona")}
                  />
                );
              })}
            </Section>

            <Banner
              message={
                canReceiveFinished
                  ? "Brak avtomatik jarima yoki qoldiq tuzatishi yaratmaydi. Omborga qabul qilish tayyor mahsulotni jismoniy ombor qoldig'iga o'tkazadi."
                  : "Brak avtomatik jarima yoki qoldiq tuzatishi yaratmaydi. Jismoniy omborga qabul qilish ombor operatori yoki menejer rolida ochiladi."
              }
              tone="info"
            />
          </>
        ) : null}
      </QueryState>
    </Screen>
  );
}
