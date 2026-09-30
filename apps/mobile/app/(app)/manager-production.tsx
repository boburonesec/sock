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
          eyebrow="Boshqaruv"
          title="Ishlab chiqarish"
          subtitle="Ishlab chiqarish operatsiyalari bo'yicha ko'rsatkichlar."
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
                { label: "Bugungi ishlab chiqarish", value: data.kpis.todayProduction },
                { label: "Jarayonda", value: data.kpis.totalInProgress },
                { label: "Eng band bosqich", value: data.kpis.busiestStageName ?? "-" },
                { label: "Faol ishchilar", value: data.kpis.activeWorkers },
              ]}
            />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"Bosqichlar kesimida"}</Text>
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
                <EmptyState title="Bosqich yo'q" description="Bosqichlar bo'yicha ma'lumot topilmadi." />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"Tiqilishlar"}</Text>
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
                <EmptyState title="Tiqilish yo'q" description="E'tibor talab qiladigan bosqich topilmadi." />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"Eng faol ishchilar"}</Text>
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
                <EmptyState title="Ishchi yo'q" description="Eng faol ishchilar ma'lumoti topilmadi." />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"Dinamika"}</Text>
              {data.trend.length ? (
                data.trend.map((item) => (
                  <InfoCard key={item.date} title={formatDate(item.date)} right={item.quantity} />
                ))
              ) : (
                <EmptyState title="Dinamika yo'q" description="Dinamika ma'lumoti topilmadi." />
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
