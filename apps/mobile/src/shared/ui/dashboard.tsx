import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/shared/styles/theme";

export function KpiGrid({
  items,
}: {
  items: { label: string; value: string; tone?: "default" | "warning" }[];
}) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[styles.kpiCard, item.tone === "warning" && styles.warningCard]}
        >
          <Text style={styles.kpiLabel}>{item.label}</Text>
          <Text style={styles.kpiValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function InfoCard({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoText}>
        <Text style={styles.infoTitle}>{title}</Text>
        {subtitle ? <Text style={styles.infoSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <Text style={styles.infoRight}>{right}</Text> : null}
    </View>
  );
}

export function AccessDeniedState() {
  return (
    <View style={[styles.infoCard, styles.deniedCard]}>
      <Text style={styles.deniedTitle}>{"Ruxsat yo'q"}</Text>
      <Text style={styles.deniedText}>
        {"Bu bo'limni ko'rish uchun manager ruxsatlari kerak."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  kpiCard: {
    width: "47%",
    minHeight: 92,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  warningCard: {
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningSurface,
  },
  kpiLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  kpiValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  infoText: {
    flex: 1,
    gap: spacing.xs,
  },
  infoTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  infoSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  infoRight: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  deniedCard: {
    alignItems: "flex-start",
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningSurface,
  },
  deniedTitle: {
    color: colors.warningText,
    fontSize: typography.body,
    fontWeight: "800",
  },
  deniedText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.caption,
    lineHeight: 18,
  },
});
