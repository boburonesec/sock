import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  managerPermissions,
  useExecutiveSummaryQuery,
} from "@/lib/api/manager-dashboard";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { AccessDeniedState, InfoCard, KpiGrid } from "@/shared/ui/dashboard";
import { EmptyState, ErrorState, LoadingState, ScreenHeader } from "@/shared/ui/states";
import { formatDate, formatStatus } from "@/shared/utils/format";
import { useAuthStore } from "@/stores/auth-store";

export default function ExecutiveSummaryScreen() {
  const permissions = useAuthStore((state) => state.permissions);
  const canView = permissions.includes(managerPermissions.executive);
  const summaryQuery = useExecutiveSummaryQuery(canView);
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
          title="Executive Summary"
          subtitle="Umumiy biznes holati va e'tibor talab qiladigan nuqtalar."
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
                { label: "Oylik savdo", value: data.kpis.monthlySales },
                { label: "Oylik xarajat", value: data.kpis.monthlyExpenses },
                { label: "Mijoz qarzi", value: data.kpis.totalClientDebt },
                { label: "Supplier qarzi", value: data.kpis.totalSupplierDebt },
                { label: "Active employees", value: data.kpis.activeEmployees },
                { label: "Active orders", value: data.kpis.activeOrders },
                { label: "Mahsulotlar", value: data.kpis.totalProducts },
                {
                  label: "Low stock",
                  value: data.kpis.lowStockMaterials,
                  tone: "warning",
                },
              ]}
            />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Business health</Text>
              <InfoCard title="Production" right={formatStatus(data.businessHealth.production)} />
              <InfoCard title="Warehouse" right={formatStatus(data.businessHealth.warehouse)} />
              <InfoCard title="Sales" right={formatStatus(data.businessHealth.sales)} />
              <InfoCard title="Finance" right={formatStatus(data.businessHealth.finance)} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top products</Text>
              {data.topProducts.length ? (
                data.topProducts.map((item) => (
                  <InfoCard
                    key={item.productVariantId}
                    title={item.productName}
                    subtitle={`${item.colorName} / ${item.materialName} / ${item.seasonName}`}
                    right={item.quantity}
                  />
                ))
              ) : (
                <EmptyState title="Top product yo'q" description="Ma'lumot topilmadi." />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Attention</Text>
              {data.attentionItems.length ? (
                data.attentionItems.map((item) => (
                  <InfoCard
                    key={item.id}
                    title={item.title}
                    subtitle={item.description}
                    right={formatStatus(item.priority)}
                  />
                ))
              ) : (
                <EmptyState title="Ogohlantirish yo'q" description="E'tibor talab qiladigan holat topilmadi." />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent activity</Text>
              {data.recentActivity.length ? (
                data.recentActivity.map((item) => (
                  <InfoCard
                    key={item.id}
                    title={item.title}
                    subtitle={`${item.description} / ${formatDate(item.occurredAt)}`}
                    right={formatStatus(item.type)}
                  />
                ))
              ) : (
                <EmptyState title="Activity yo'q" description="So'nggi faoliyat topilmadi." />
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
