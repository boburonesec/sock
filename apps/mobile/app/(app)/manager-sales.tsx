import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { managerPermissions, useSalesSummaryQuery } from "@/lib/api/manager-dashboard";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { AccessDeniedState, InfoCard, KpiGrid } from "@/shared/ui/dashboard";
import { EmptyState, ErrorState, LoadingState, ScreenHeader } from "@/shared/ui/states";
import { formatAmount, formatDate, formatStatus } from "@/shared/utils/format";
import { useAuthStore } from "@/stores/auth-store";

export default function SalesSummaryScreen() {
  const permissions = useAuthStore((state) => state.permissions);
  const canView = permissions.includes(managerPermissions.sales);
  const summaryQuery = useSalesSummaryQuery(canView);
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
          title="Savdo"
          subtitle="Savdo ko'rsatkichlari, asosiy mijozlar va so'nggi buyurtmalar."
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
                { label: "Mijozlar", value: data.kpis.clientCount },
                { label: "Faol buyurtmalar", value: data.kpis.activeOrderCount },
                { label: "Oylik savdo", value: formatAmount(data.kpis.monthlySales) },
                {
                  label: "Mijoz qarzi",
                  value: formatAmount(data.kpis.totalClientDebt),
                  tone: "warning",
                },
              ]}
            />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"Asosiy mijozlar"}</Text>
              {data.topClients.length ? (
                data.topClients.map((client) => (
                  <InfoCard
                    key={client.client.id}
                    title={client.client.name}
                    subtitle={`Paid ${client.totalPaid} / debt ${client.debt}`}
                    right={formatAmount(client.totalOrders)}
                  />
                ))
              ) : (
                <EmptyState title="Mijoz yo'q" description="Asosiy mijozlar ma'lumoti topilmadi." />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"So'nggi buyurtmalar"}</Text>
              {data.recentOrders.length ? (
                data.recentOrders.map((order) => (
                  <InfoCard
                    key={order.id}
                    title={order.orderNumber}
                    subtitle={`${order.client.name} / ${formatDate(order.createdAt)} / ${formatStatus(order.paymentStatus)}`}
                    right={formatAmount(order.totalAmount)}
                  />
                ))
              ) : (
                <EmptyState title="Buyurtma yo'q" description="So'nggi buyurtma topilmadi." />
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
