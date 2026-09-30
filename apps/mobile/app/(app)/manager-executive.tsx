import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  managerPermissions,
  useExecutiveSummaryQuery,
} from "@/lib/api/manager-dashboard";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { AccessDeniedState, InfoCard, KpiGrid } from "@/shared/ui/dashboard";
import { EmptyState, ErrorState, LoadingState, ScreenHeader } from "@/shared/ui/states";
import { formatAmount, formatDate, formatStatus } from "@/shared/utils/format";
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
          eyebrow="Boshqaruv"
          title="Umumiy holat"
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
                { label: "Oylik savdo", value: formatAmount(data.kpis.monthlySales) },
                { label: "Oylik xarajat", value: formatAmount(data.kpis.monthlyExpenses) },
                { label: "Mijoz qarzi", value: formatAmount(data.kpis.totalClientDebt) },
                { label: "Yetkazib beruvchi qarzi", value: formatAmount(data.kpis.totalSupplierDebt) },
                { label: "Faol xodimlar", value: data.kpis.activeEmployees },
                { label: "Faol buyurtmalar", value: data.kpis.activeOrders },
                { label: "Mahsulotlar", value: data.kpis.totalProducts },
                {
                  label: "Kam qoldiq",
                  value: data.kpis.lowStockMaterials,
                  tone: "warning",
                },
              ]}
            />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"Biznes holati"}</Text>
              <InfoCard title="Ishlab chiqarish" right={formatStatus(data.businessHealth.production)} />
              <InfoCard title="Ombor" right={formatStatus(data.businessHealth.warehouse)} />
              <InfoCard title="Savdo" right={formatStatus(data.businessHealth.sales)} />
              <InfoCard title="Moliya" right={formatStatus(data.businessHealth.finance)} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"Asosiy mahsulotlar"}</Text>
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
                <EmptyState title="Mahsulot yo'q" description="Ma'lumot topilmadi." />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"E'tibor talab"}</Text>
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
              <Text style={styles.sectionTitle}>{"So'nggi faoliyat"}</Text>
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
                <EmptyState title="Faoliyat yo'q" description="So'nggi faoliyat topilmadi." />
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
