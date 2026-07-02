import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  managerPermissions,
  useWarehouseSummaryQuery,
} from "@/lib/api/manager-dashboard";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { AccessDeniedState, InfoCard, KpiGrid } from "@/shared/ui/dashboard";
import { EmptyState, ErrorState, LoadingState, ScreenHeader } from "@/shared/ui/states";
import { formatStatus } from "@/shared/utils/format";
import { useAuthStore } from "@/stores/auth-store";

export default function WarehouseSummaryScreen() {
  const permissions = useAuthStore((state) => state.permissions);
  const canView = permissions.includes(managerPermissions.warehouse);
  const summaryQuery = useWarehouseSummaryQuery(canView);
  const data = summaryQuery.data;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={summaryQuery.isRefetching}
            tintColor={colors.accent}
            onRefresh={() => void summaryQuery.refetch()}
          />
        }
      >
        <ScreenHeader
          eyebrow="Manager"
          title="Warehouse Summary"
          subtitle="Ombor stock summary va low stock materiallar."
        />

        {!canView ? <AccessDeniedState /> : null}
        {canView && summaryQuery.isLoading ? <LoadingState /> : null}
        {canView && summaryQuery.isError ? (
          <ErrorState error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
        ) : null}

        {canView && data ? (
          <>
            <KpiGrid
              items={[
                { label: "Finished product", value: data.kpis.finishedProductQuantity },
                { label: "Material records", value: data.kpis.materialRecordCount },
                {
                  label: "Low stock",
                  value: data.kpis.lowStockMaterialCount,
                  tone: "warning",
                },
                { label: "Warehouse zones", value: data.kpis.warehouseZoneCount },
              ]}
            />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Zones</Text>
              {data.zoneSummaries.length ? (
                data.zoneSummaries.map((zone) => (
                  <InfoCard
                    key={zone.zoneId}
                    title={zone.zoneName}
                    subtitle={`${zone.warehouseName} / ${formatStatus(zone.status)}`}
                    right={zone.productQuantity}
                  />
                ))
              ) : (
                <EmptyState title="Zone yo'q" description="Warehouse zone summary topilmadi." />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Low stock materials</Text>
              {data.lowStockMaterials.length ? (
                data.lowStockMaterials.map((material) => (
                  <InfoCard
                    key={`${material.warehouseId}-${material.materialId}`}
                    title={material.materialName}
                    subtitle={`${material.warehouseName} / threshold ${material.threshold} ${material.unit}`}
                    right={`${material.quantity} ${material.unit}`}
                  />
                ))
              ) : (
                <EmptyState title="Low stock yo'q" description="Low stock material topilmadi." />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
  section: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceRaised,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
});
