import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  managerPermissions,
  useProductionSummaryQuery,
} from "@/lib/api/manager-dashboard";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { AccessDeniedState, InfoCard, KpiGrid } from "@/shared/ui/dashboard";
import { EmptyState, ErrorState, LoadingState, ScreenHeader } from "@/shared/ui/states";
import { formatAmount, formatDate, formatStatus } from "@/shared/utils/format";
import { useAuthStore } from "@/stores/auth-store";

export default function ProductionSummaryScreen() {
  const permissions = useAuthStore((state) => state.permissions);
  const canView = permissions.includes(managerPermissions.production);
  const summaryQuery = useProductionSummaryQuery(canView);
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
          title="Production Summary"
          subtitle="Ishlab chiqarish operatsiyalari bo'yicha backend summary."
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
                { label: "Bugungi production", value: data.kpis.todayProduction },
                { label: "In progress", value: data.kpis.totalInProgress },
                { label: "Eng band stage", value: data.kpis.busiestStageName ?? "-" },
                { label: "Active workers", value: data.kpis.activeWorkers },
              ]}
            />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stage totals</Text>
              {data.stageTotals.length ? (
                data.stageTotals.map((stage) => (
                  <InfoCard
                    key={stage.stageId}
                    title={stage.stageName}
                    subtitle={formatStatus(stage.status)}
                    right={stage.quantity}
                  />
                ))
              ) : (
                <EmptyState title="Stage yo'q" description="Stage summary topilmadi." />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bottlenecks</Text>
              {data.bottlenecks.length ? (
                data.bottlenecks.map((item) => (
                  <InfoCard
                    key={item.stageId}
                    title={item.stageName}
                    subtitle={formatStatus(item.priority)}
                    right={item.quantity}
                  />
                ))
              ) : (
                <EmptyState title="Bottleneck yo'q" description="E'tibor talab qiladigan stage topilmadi." />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top workers</Text>
              {data.topWorkers.length ? (
                data.topWorkers.map((worker) => (
                  <InfoCard
                    key={worker.employeeId}
                    title={worker.employeeName}
                    subtitle={worker.stageName}
                    right={formatAmount(worker.amount)}
                  />
                ))
              ) : (
                <EmptyState title="Worker yo'q" description="Top worker ma'lumoti topilmadi." />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trend</Text>
              {data.trend.length ? (
                data.trend.map((item) => (
                  <InfoCard key={item.date} title={formatDate(item.date)} right={item.quantity} />
                ))
              ) : (
                <EmptyState title="Trend yo'q" description="Trend ma'lumoti topilmadi." />
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
