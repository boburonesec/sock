import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { managerPermissions } from "@/lib/api/manager-dashboard";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { AccessDeniedState } from "@/shared/ui/dashboard";
import { ScreenHeader } from "@/shared/ui/states";
import { useAuthStore } from "@/stores/auth-store";

const managerCards = [
  {
    title: "Executive Summary",
    subtitle: "Umumiy biznes holati",
    href: "/(app)/manager-executive",
    icon: "analytics-outline",
    permission: managerPermissions.executive,
  },
  {
    title: "Production Summary",
    subtitle: "Ishlab chiqarish ko'rsatkichlari",
    href: "/(app)/manager-production",
    icon: "construct-outline",
    permission: managerPermissions.production,
  },
  {
    title: "Warehouse Summary",
    subtitle: "Ombor va low stock",
    href: "/(app)/manager-warehouse",
    icon: "cube-outline",
    permission: managerPermissions.warehouse,
  },
  {
    title: "Sales Summary",
    subtitle: "Savdo va mijoz qarzi",
    href: "/(app)/manager-sales",
    icon: "receipt-outline",
    permission: managerPermissions.sales,
  },
  {
    title: "Finance Summary",
    subtitle: "Xarajat, avans va payroll",
    href: "/(app)/manager-finance",
    icon: "card-outline",
    permission: managerPermissions.finance,
  },
] as const;

export default function ManagerHomeScreen() {
  const permissions = useAuthStore((state) => state.permissions);
  const visibleCards = managerCards.filter((card) =>
    permissions.includes(card.permission),
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Manager"
          title="Dashboard"
          subtitle="Backend summary APIlaridan olingan boshqaruv ko'rsatkichlari."
        />

        {visibleCards.length === 0 ? <AccessDeniedState /> : null}

        <View style={styles.grid}>
          {visibleCards.map((card) => (
            <Link asChild href={card.href} key={card.title}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              >
                <View style={styles.iconBox}>
                  <Ionicons color={colors.accent} name={card.icon} size={24} />
                </View>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
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
  grid: {
    gap: spacing.md,
  },
  card: {
    minHeight: 112,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  cardPressed: {
    opacity: 0.82,
  },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
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
});
