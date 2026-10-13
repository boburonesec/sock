import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAccess } from "@/lib/access/use-access";
import { useOperationsSummaryQuery } from "@/lib/api/production";
import { routes } from "@/lib/routes";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { AccessDeniedState, InfoCard, KpiGrid } from "@/shared/ui/dashboard";
import { EmptyState, ErrorState, LoadingState, ScreenHeader } from "@/shared/ui/states";
import { formatAmount, formatDate, formatStatus } from "@/shared/utils/format";
import { BackButton } from "@/shared/ui/screen";

export default function ProductionSummaryScreen() {
  const access = useAccess();
  // Web gates /dashboard/operations by dashboard.view; its data needs production.view.
  const canView =
    access.area("dashboardOperations").allowed && access.can("productionOperationsSummary");
  const summaryQuery = useOperationsSummaryQuery(canView);
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
        <BackButton backTo={routes.home} />
        <ScreenHeader
          eyebrow="Boshqaruv"
          title="Operatsion panel"
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

            {data.attention.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{"E'tibor kerak"}</Text>
                {data.attention.map((item) => (
                  <InfoCard key={item} title={item} />
                ))}
              </View>
            ) : null}

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
