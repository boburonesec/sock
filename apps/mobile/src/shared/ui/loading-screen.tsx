import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/shared/styles/theme";

export function LoadingScreen({ label = "Yuklanmoqda" }: { label?: string }) {
  return (
    <View style={styles.screen}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.body,
    textAlign: "center",
  },
});

