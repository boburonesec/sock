import { Link } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useEmployeeMeQuery } from "@/lib/api/mobile-employee";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { EmptyState, ErrorState, LoadingState, ScreenHeader } from "@/shared/ui/states";
import { formatDate, formatStatus } from "@/shared/utils/format";
import { useAuthStore } from "@/stores/auth-store";

export default function ProfileScreen() {
  const meQuery = useEmployeeMeQuery();
  const logout = useAuthStore((state) => state.logout);
  const isLoadingSession = useAuthStore((state) => state.isLoadingSession);

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
          eyebrow="Profil"
          title="Xodim profili"
          subtitle="Ma'lumotlar faqat o'qish uchun."
        />

        {meQuery.isLoading ? <LoadingState /> : null}

        {meQuery.isError ? (
          <ErrorState error={meQuery.error} onRetry={() => void meQuery.refetch()} />
        ) : null}

        {meQuery.data ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Xodim</Text>
              <InfoRow label="F.I.Sh." value={meQuery.data.employee.name} />
              <InfoRow
                label="Holat"
                value={formatStatus(meQuery.data.employee.status)}
              />
              <InfoRow
                label="Yaratilgan"
                value={formatDate(meQuery.data.employee.createdAt)}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Factory / Tenant</Text>
              <InfoRow label="Factory" value={meQuery.data.factory.name} />
              <InfoRow label="Tenant" value={meQuery.data.tenant.name} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Akkaunt</Text>
              <InfoRow label="Ism" value={meQuery.data.user.name} />
              <InfoRow label="Email" value={meQuery.data.user.email} />
              <InfoRow label="Holat" value={formatStatus(meQuery.data.user.status)} />
            </View>

            <Link asChild href="/(app)/advances">
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {"Avanslar tarixini ko'rish"}
                </Text>
              </Pressable>
            </Link>

            <Pressable
              accessibilityRole="button"
              disabled={isLoadingSession}
              onPress={logout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && !isLoadingSession && styles.buttonPressed,
                isLoadingSession && styles.buttonDisabled,
              ]}
            >
              {isLoadingSession ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.logoutText}>Chiqish</Text>
              )}
            </Pressable>
          </>
        ) : null}

        {!meQuery.isLoading && !meQuery.isError && !meQuery.data ? (
          <EmptyState
            title="Profil topilmadi"
            description="Xodim profilingiz hozircha ko'rinmayapti."
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
  section: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  row: {
    gap: spacing.xs,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  rowValue: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  secondaryButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  logoutButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  logoutText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
