import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, touchTarget, typography } from "@/shared/styles/theme";
import { FlashBanner } from "@/shared/ui/feedback";

interface ScreenProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  /** Show a back button. Falls back to this route when there is no history (deep link). */
  backTo?: Href;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Pinned below the scroll area, above the keyboard — for the primary form action. */
  footer?: ReactNode;
  children: ReactNode;
}

/** Back control for screens that do not use the <Screen> shell. */
export function BackButton({ backTo }: { backTo: Href }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel="Orqaga"
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => (router.canGoBack() ? router.back() : router.replace(backTo))}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}
    >
      <Ionicons color={colors.accent} name="chevron-back" size={22} />
      <Text style={styles.backText}>Orqaga</Text>
    </Pressable>
  );
}

/**
 * Standard screen shell: safe area, optional back button, pull-to-refresh and
 * a keyboard-safe pinned footer so the primary action is never under the keys.
 */
export function Screen({
  title,
  eyebrow,
  subtitle,
  backTo,
  refreshing,
  onRefresh,
  footer,
  children,
}: ScreenProps) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                tintColor={colors.accent}
                onRefresh={onRefresh}
              />
            ) : undefined
          }
        >
          {backTo ? <BackButton backTo={backTo} /> : null}

          <View style={styles.header}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          <FlashBanner />

          {children}
        </ScrollView>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  back: {
    minHeight: touchTarget,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    marginBottom: -spacing.sm,
    marginLeft: -spacing.xs,
    paddingRight: spacing.md,
  },
  backText: {
    color: colors.accent,
    fontSize: typography.body,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  footer: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
});
