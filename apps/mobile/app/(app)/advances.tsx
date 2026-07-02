import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useEmployeeAdvancesQuery } from "@/lib/api/mobile-employee";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { EmptyState, ErrorState, LoadingState, ScreenHeader } from "@/shared/ui/states";
import { formatAmount, formatDate, formatMonth, formatStatus } from "@/shared/utils/format";

export default function AdvancesScreen() {
  const advancesQuery = useEmployeeAdvancesQuery();
  const advances = advancesQuery.data ?? [];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={advancesQuery.isRefetching}
            tintColor={colors.accent}
            onRefresh={() => void advancesQuery.refetch()}
          />
        }
      >
        <ScreenHeader
          eyebrow="Avanslar"
          title="Avans tarixi"
          subtitle="Faqat sizga tegishli advance yozuvlari."
        />

        {advancesQuery.isLoading ? <LoadingState /> : null}

        {advancesQuery.isError ? (
          <ErrorState error={advancesQuery.error} onRetry={() => void advancesQuery.refetch()} />
        ) : null}

        {!advancesQuery.isLoading && !advancesQuery.isError && advances.length === 0 ? (
          <EmptyState
            title="Avans yo'q"
            description="Hozircha sizga tegishli avans yozuvlari topilmadi."
          />
        ) : null}

        {advances.map((advance) => (
          <View key={advance.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.titleGroup}>
                <Text style={styles.amount}>{formatAmount(advance.amount)}</Text>
                <Text style={styles.status}>{formatStatus(advance.status)}</Text>
              </View>
              <Text style={styles.reason}>{advance.reason}</Text>
            </View>

            <View style={styles.timeline}>
              <Info label="So'ralgan" value={formatDate(advance.requestedAt)} />
              <Info label="Tasdiqlangan" value={formatDate(advance.approvedAt)} />
              <Info label="To'langan" value={formatDate(advance.paidAt)} />
            </View>

            {advance.payrollPeriod ? (
              <Text style={styles.period}>
                Payroll: {formatMonth(advance.payrollPeriod.month)} /{" "}
                {formatStatus(advance.payrollPeriod.status)}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  card: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  cardHeader: {
    gap: spacing.sm,
  },
  titleGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  amount: {
    flex: 1,
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  status: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  reason: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  timeline: {
    gap: spacing.sm,
  },
  info: {
    gap: spacing.xs,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  infoValue: {
    color: colors.text,
    fontSize: typography.body,
  },
  period: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
});
