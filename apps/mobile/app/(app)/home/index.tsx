import { TENANT_AREAS, formatRoleName, type TenantAreaKey } from "@paypoq/shared";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useAccess } from "@/lib/access/use-access";
import { isApiError } from "@/lib/api/errors";
import { useEmployeeMeQuery } from "@/lib/api/mobile-employee";
import { areaRoutes, routes } from "@/lib/routes";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { SkeletonList } from "@/shared/ui/feedback";
import { ActionTile, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState, ErrorState } from "@/shared/ui/states";
import { formatStatus } from "@/shared/utils/format";
import { useAuthStore } from "@/stores/auth-store";

type HomeArea = keyof typeof areaRoutes;

const areaTiles: { area: HomeArea; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { area: "dashboardExecutive", subtitle: "Umumiy biznes holati", icon: "analytics-outline" },
  { area: "dashboardOperations", subtitle: "Ishlab chiqarish ko'rsatkichlari", icon: "speedometer-outline" },
  { area: "production", subtitle: "Bosqichlar, o'tkazish, smena yakuni", icon: "git-network-outline" },
  { area: "machines", subtitle: "Stanok ishi va chiqqan mahsulot", icon: "cog-outline" },
  { area: "mechanic", subtitle: "O'lchovlar va texnik vazifalar", icon: "build-outline" },
  { area: "warehouse", subtitle: "Qoldiq, kirim va tuzatishlar", icon: "cube-outline" },
  { area: "sales", subtitle: "Savdo va mijoz qarzi", icon: "receipt-outline" },
  { area: "finance", subtitle: "Xarajat, avans va oylik", icon: "card-outline" },
];

const areaTitles: Partial<Record<TenantAreaKey, string>> = {
  dashboardExecutive: "Umumiy holat",
  dashboardOperations: "Operatsion panel",
};

const selfServiceTiles = [
  { title: "Oylik", subtitle: "Oylik hisob-kitoblari", href: routes.payroll, icon: "wallet-outline" },
  { title: "Ishlar", subtitle: "So'nggi faoliyatlar", href: routes.activities, icon: "list-outline" },
  { title: "Avanslar", subtitle: "Avans tarixi", href: routes.advances, icon: "cash-outline" },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const access = useAccess();
  const meQuery = useEmployeeMeQuery();
  const currentUser = useAuthStore((state) => state.currentUser);
  const activeFactoryId = useAuthStore((state) => state.activeFactoryId);
  const accessibleFactories = useAuthStore((state) => state.accessibleFactories);
  const factoryName =
    meQuery.data?.factory.name ??
    accessibleFactories.find((factory) => factory.id === activeFactoryId)?.name;
  // Owners/managers without an employee profile get 403 from /mobile/employee/*.
  const hasNoEmployeeProfile = isApiError(meQuery.error, 403);
  const visibleAreas = areaTiles.filter((tile) => access.area(tile.area).allowed);

  return (
    <Screen
      eyebrow="Paypoq Mobile"
      onRefresh={() => void meQuery.refetch()}
      refreshing={meQuery.isRefetching}
      title="Bosh sahifa"
    >
      <View style={styles.summary}>
        <Text style={styles.name}>
          {meQuery.data?.employee.name ?? currentUser?.name ?? "Foydalanuvchi"}
        </Text>
        {factoryName ? <Text style={styles.muted}>{factoryName}</Text> : null}
        {access.roles.length ? (
          <Text style={styles.muted}>{access.roles.map(formatRoleName).join(", ")}</Text>
        ) : null}
        {meQuery.data ? (
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.status}>{formatStatus(meQuery.data.employee.status)}</Text>
          </View>
        ) : null}
      </View>

      {visibleAreas.length ? (
        <Section title="Bo'limlar">
          {visibleAreas.map((tile) => (
            <ActionTile
              icon={tile.icon}
              key={tile.area}
              onPress={() => router.push(areaRoutes[tile.area])}
              subtitle={tile.subtitle}
              title={areaTitles[tile.area] ?? TENANT_AREAS[tile.area].label}
            />
          ))}
        </Section>
      ) : null}

      {meQuery.isLoading ? <SkeletonList rows={2} /> : null}

      {meQuery.data ? (
        <Section title="Shaxsiy">
          {selfServiceTiles.map((tile) => (
            <ActionTile
              icon={tile.icon}
              key={tile.title}
              onPress={() => router.push(tile.href)}
              subtitle={tile.subtitle}
              title={tile.title}
            />
          ))}
        </Section>
      ) : null}

      {meQuery.isError && !(hasNoEmployeeProfile && visibleAreas.length) ? (
        <ErrorState error={meQuery.error} onRetry={() => void meQuery.refetch()} />
      ) : null}

      {!meQuery.isLoading && hasNoEmployeeProfile && !visibleAreas.length ? (
        <EmptyState
          description="Akkauntingizga hali ish bo'limi biriktirilmagan. Rahbaringizga murojaat qiling."
          title="Bo'lim topilmadi"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  muted: {
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
});
