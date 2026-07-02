import { Link } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useEmployeePayrollQuery } from "@/lib/api/mobile-employee";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { EmptyState, ErrorState, LoadingState, ScreenHeader } from "@/shared/ui/states";
import { formatAmount, formatMonth, formatStatus } from "@/shared/utils/format";

export default function PayrollScreen() {
  const payrollQuery = useEmployeePayrollQuery();
  const payrollItems = payrollQuery.data ?? [];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={payrollQuery.isRefetching}
            tintColor={colors.accent}
            onRefresh={() => void payrollQuery.refetch()}
          />
        }
      >
        <ScreenHeader
          eyebrow="Oylik"
          title="Payroll snapshotlar"
          subtitle="Backend hisoblagan va saqlagan qiymatlar."
        />

        <Link asChild href="/(app)/advances">
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.linkButton, pressed && styles.linkPressed]}
          >
            <Text style={styles.linkButtonText}>{"Avanslar tarixini ko'rish"}</Text>
          </Pressable>
        </Link>

        {payrollQuery.isLoading ? <LoadingState /> : null}

        {payrollQuery.isError ? (
          <ErrorState error={payrollQuery.error} onRetry={() => void payrollQuery.refetch()} />
        ) : null}

        {!payrollQuery.isLoading && !payrollQuery.isError && payrollItems.length === 0 ? (
          <EmptyState
            title="Payroll yo'q"
            description="Hozircha sizga tegishli payroll snapshot topilmadi."
          />
        ) : null}

        {payrollItems.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{formatMonth(item.month)}</Text>
              <Text style={styles.status}>
                {formatStatus(item.payrollPeriodStatus)} / {formatStatus(item.status)}
              </Text>
            </View>

            <View style={styles.amountGrid}>
              <Amount label="Ishlangan" value={item.workedAmount} />
              <Amount label="Bonus" value={item.bonusAmount} />
              <Amount label="Jarima" value={item.penaltyAmount} />
              <Amount label="Avans" value={item.advanceAmount} />
              <Amount label="To'langan" value={item.paidAmount} />
              <Amount label="Qolgan" value={item.remainingAmount} />
            </View>

            <View style={styles.finalRow}>
              <Text style={styles.finalLabel}>Yakuniy summa</Text>
              <Text style={styles.finalAmount}>{formatAmount(item.finalAmount)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Amount({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.amountBox}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={styles.amountValue}>{formatAmount(value)}</Text>
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
  linkButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  linkPressed: {
    opacity: 0.82,
  },
  linkButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
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
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  status: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  amountBox: {
    width: "47%",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceRaised,
  },
  amountLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  amountValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  finalRow: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceRaised,
  },
  finalLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  finalAmount: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
});
