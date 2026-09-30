import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { managerPermissions, useFinanceSummaryQuery } from "@/lib/api/manager-dashboard";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { AccessDeniedState, InfoCard, KpiGrid } from "@/shared/ui/dashboard";
import { EmptyState, ErrorState, LoadingState, ScreenHeader } from "@/shared/ui/states";
import { formatAmount, formatDate, formatMonth, formatStatus } from "@/shared/utils/format";
import { useAuthStore } from "@/stores/auth-store";

export default function FinanceSummaryScreen() {
  const permissions = useAuthStore((state) => state.permissions);
  const canView = permissions.includes(managerPermissions.finance);
  const summaryQuery = useFinanceSummaryQuery(canView);
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
          title="Moliya"
          subtitle="Xarajatlar, avanslar va oylik qoldiqlari."
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
                { label: "Oylik xarajat", value: formatAmount(data.kpis.monthlyExpenses) },
                { label: "Kutilayotgan xarajatlar", value: formatAmount(data.kpis.pendingExpenses) },
                { label: "Kutilayotgan avanslar", value: formatAmount(data.kpis.pendingAdvances) },
                {
                  label: "Oylik qoldig'i",
                  value: formatAmount(data.kpis.payrollRemaining),
                  tone: "warning",
                },
              ]}
            />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"So'nggi xarajatlar"}</Text>
              {data.recentExpenses.length ? (
                data.recentExpenses.map((expense) => (
                  <InfoCard
                    key={expense.id}
                    title={expense.category.name}
                    subtitle={`${expense.reason} / ${formatDate(expense.requestedAt)} / ${formatStatus(expense.status)}`}
                    right={formatAmount(expense.amount)}
                  />
                ))
              ) : (
                <EmptyState title="Xarajat yo'q" description="So'nggi xarajat topilmadi." />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"So'nggi avanslar"}</Text>
              {data.recentAdvances.length ? (
                data.recentAdvances.map((advance) => (
                  <InfoCard
                    key={advance.id}
                    title={advance.employee.name}
                    subtitle={`${advance.reason} / ${formatDate(advance.requestedAt)} / ${formatStatus(advance.status)}`}
                    right={formatAmount(advance.amount)}
                  />
                ))
              ) : (
                <EmptyState title="Avans yo'q" description="So'nggi avans topilmadi." />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"Oylik davrlari"}</Text>
              {data.payrollPeriods.length ? (
                data.payrollPeriods.map((period) => (
                  <InfoCard
                    key={period.id}
                    title={formatMonth(period.month)}
                    subtitle={`Paid ${period.totalPaidAmount} / remaining ${period.totalRemainingAmount}`}
                    right={formatStatus(period.status)}
                  />
                ))
              ) : (
                <EmptyState title="Oylik davri yo'q" description="Oylik davri topilmadi." />
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
