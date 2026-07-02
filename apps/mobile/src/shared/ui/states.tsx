import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { getUserFacingErrorMessage } from "@/lib/api/errors";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.header}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function LoadingState({ label = "Ma'lumotlar yuklanmoqda" }: { label?: string }) {
  return (
    <View style={styles.stateBox}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.stateBox}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{description}</Text>
    </View>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <View style={[styles.stateBox, styles.errorBox]}>
      <Text style={styles.errorTitle}>Xatolik</Text>
      <Text style={styles.errorText}>{getUserFacingErrorMessage(error)}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
      >
        <Text style={styles.retryText}>Qayta urinish</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  stateBox: {
    gap: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  stateTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
    textAlign: "center",
  },
  stateText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: "center",
  },
  errorBox: {
    alignItems: "stretch",
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerSurface,
  },
  errorTitle: {
    color: colors.dangerText,
    fontSize: typography.body,
    fontWeight: "800",
    textAlign: "center",
  },
  errorText: {
    color: colors.dangerText,
    fontSize: typography.caption,
    lineHeight: 18,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  retryButtonPressed: {
    opacity: 0.82,
  },
  retryText: {
    color: colors.buttonText,
    fontSize: typography.caption,
    fontWeight: "800",
  },
});
