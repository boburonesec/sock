import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useEmployeeMeQuery } from "@/lib/api/mobile-employee";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { EmptyState, ErrorState, LoadingState, ScreenHeader } from "@/shared/ui/states";
import { formatStatus } from "@/shared/utils/format";

const quickCards = [
  {
    title: "Oylik",
    subtitle: "Payroll snapshotlar",
    href: "/(app)/payroll",
    icon: "wallet-outline",
  },
  {
    title: "Ishlar",
    subtitle: "So'nggi faoliyatlar",
    href: "/(app)/activities",
    icon: "list-outline",
  },
  {
    title: "Avanslar",
    subtitle: "Avans tarixi",
    href: "/(app)/advances",
    icon: "cash-outline",
  },
  {
    title: "Profil",
    subtitle: "Xodim ma'lumotlari",
    href: "/(app)/profile",
    icon: "person-outline",
  },
] as const;

export default function HomeScreen() {
  const meQuery = useEmployeeMeQuery();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={meQuery.isRefetching}
            tintColor={colors.accent}
            onRefresh={() => void meQuery.refetch()}
          />
        }
      >
        <ScreenHeader
          eyebrow="Employee Mobile"
          title="Bosh sahifa"
          subtitle="Shaxsiy ish, oylik va profil ma'lumotlaringiz."
        />

        {meQuery.isLoading ? <LoadingState /> : null}

        {meQuery.isError ? (
          <ErrorState error={meQuery.error} onRetry={() => void meQuery.refetch()} />
        ) : null}

        {meQuery.data ? (
          <>
            <View style={styles.summary}>
              <Text style={styles.name}>{meQuery.data.employee.name}</Text>
              <Text style={styles.factory}>{meQuery.data.factory.name}</Text>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.status}>
                  {formatStatus(meQuery.data.employee.status)}
                </Text>
              </View>
            </View>

            <View style={styles.quickGrid}>
              {quickCards.map((card) => (
                <Link asChild href={card.href} key={card.title}>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.quickCard,
                      pressed && styles.quickCardPressed,
                    ]}
                  >
                    <View style={styles.quickIcon}>
                      <Ionicons
                        color={colors.accent}
                        name={card.icon}
                        size={22}
                      />
                    </View>
                    <Text style={styles.quickTitle}>{card.title}</Text>
                    <Text style={styles.quickSubtitle}>{card.subtitle}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </>
        ) : null}

        {!meQuery.isLoading && !meQuery.isError && !meQuery.data ? (
          <EmptyState
            title="Ma'lumot topilmadi"
            description="Xodim profilingiz hozircha ko'rinmayapti."
          />
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
  summary: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  name: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
  },
  factory: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  status: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  quickCard: {
    width: "47%",
    minHeight: 132,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceRaised,
  },
  quickCardPressed: {
    opacity: 0.82,
  },
  quickIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  quickTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  quickSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
});
