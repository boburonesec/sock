import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useEmployeeActivitiesQuery } from "@/lib/api/mobile-employee";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { EmptyState, ErrorState, LoadingState, ScreenHeader } from "@/shared/ui/states";
import { formatAmount, formatDate } from "@/shared/utils/format";

export default function ActivitiesScreen() {
  const activitiesQuery = useEmployeeActivitiesQuery();
  const activities = activitiesQuery.data ?? [];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={activitiesQuery.isRefetching}
            tintColor={colors.accent}
            onRefresh={() => void activitiesQuery.refetch()}
          />
        }
      >
        <ScreenHeader
          eyebrow="Ishlar"
          title="So'nggi faoliyatlar"
          subtitle="Shift Receiver kiritgan ish yozuvlari."
        />

        {activitiesQuery.isLoading ? <LoadingState /> : null}

        {activitiesQuery.isError ? (
          <ErrorState
            error={activitiesQuery.error}
            onRetry={() => void activitiesQuery.refetch()}
          />
        ) : null}

        {!activitiesQuery.isLoading && !activitiesQuery.isError && activities.length === 0 ? (
          <EmptyState
            title="Faoliyatlar yo'q"
            description="Hozircha sizga tegishli ish yozuvlari topilmadi."
          />
        ) : null}

        {activities.map((activity) => (
          <View key={activity.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleGroup}>
                <Text style={styles.cardTitle}>{activity.stage.name}</Text>
                <Text style={styles.cardSubtitle}>{activity.productVariant.label}</Text>
              </View>
              <Text style={styles.date}>{formatDate(activity.activityDate)}</Text>
            </View>

            <View style={styles.metricRow}>
              <Metric label="Miqdor" value={`${activity.quantity}`} />
              <Metric label="Tarixiy rate" value={formatAmount(activity.salaryRateAmount)} />
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
  cardTitleGroup: {
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  cardSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  date: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metric: {
    flex: 1,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceRaised,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
});
