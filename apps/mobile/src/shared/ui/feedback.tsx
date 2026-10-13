import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getUserFacingErrorMessage } from "@/lib/api/errors";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { Button } from "@/shared/ui/controls";
import { isContextCurrent, sameSession } from "@/lib/auth/request-context";
import { useSessionContext } from "@/lib/auth/use-session-context";
import { useUiStore } from "@/stores/ui-store";

type Tone = "success" | "error" | "warning" | "info";

const toneStyles = {
  success: { border: colors.successBorder, background: colors.successSurface, text: colors.successText },
  error: { border: colors.dangerBorder, background: colors.dangerSurface, text: colors.dangerText },
  warning: { border: colors.warningBorder, background: colors.warningSurface, text: colors.warningText },
  info: { border: colors.border, background: colors.surfaceRaised, text: colors.text },
} as const;

const toneIcons: Record<Tone, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  warning: "warning",
  info: "information-circle",
};

/** Inline status message. `error`/`success` are announced to screen readers. */
export function Banner({ tone, message, title }: { tone: Tone; message: string; title?: string }) {
  const palette = toneStyles[tone];

  return (
    <View
      accessibilityLiveRegion={tone === "error" || tone === "success" ? "polite" : "none"}
      accessibilityRole={tone === "error" ? "alert" : "text"}
      style={[styles.banner, { borderColor: palette.border, backgroundColor: palette.background }]}
    >
      <Ionicons color={palette.text} name={toneIcons[tone]} size={20} />
      <View style={styles.bannerText}>
        {title ? <Text style={[styles.bannerTitle, { color: palette.text }]}>{title}</Text> : null}
        <Text style={[styles.bannerMessage, { color: palette.text }]}>{message}</Text>
      </View>
    </View>
  );
}

/** Renders a failed write. Nothing is shown while there is no error. */
export function MutationError({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }

  return <Banner message={getUserFacingErrorMessage(error, "action")} tone="error" />;
}

export function Badge({ label, tone = "info" }: { label: string; tone?: Tone }) {
  const palette = toneStyles[tone];

  return (
    <View style={[styles.badge, { borderColor: palette.border, backgroundColor: palette.background }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

/** Explicit state for a route or action the signed-in user is not allowed to use. */
export function AccessDenied({ reason }: { reason?: string }) {
  return (
    <View style={[styles.banner, styles.denied]}>
      <Ionicons color={colors.warningText} name="lock-closed" size={20} />
      <View style={styles.bannerText}>
        <Text style={[styles.bannerTitle, { color: colors.warningText }]}>{"Ruxsat yo'q"}</Text>
        <Text style={[styles.bannerMessage, { color: colors.text }]}>
          {reason ?? "Bu bo'limni ochish uchun ruxsatingiz yetarli emas."}
        </Text>
      </View>
    </View>
  );
}

/** Placeholder rows shown while a list loads, sized like the real cards. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <View accessibilityLabel="Ma'lumotlar yuklanmoqda" style={styles.skeletonList}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={[styles.skeletonLine, styles.skeletonLineWide]} />
          <View style={[styles.skeletonLine, styles.skeletonLineNarrow]} />
        </View>
      ))}
    </View>
  );
}

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  error?: unknown;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Explicit confirmation for irreversible actions. It stays open while the
 * request runs and shows the API error in place, so a failed action can be
 * retried or cancelled without losing context.
 */
export function ConfirmSheet({
  visible,
  title,
  description,
  confirmLabel,
  destructive,
  pending,
  error,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={pending ? undefined : onCancel}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Bekor qilish"
          disabled={pending}
          onPress={onCancel}
          style={styles.overlayDismiss}
        />
        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          <View accessibilityViewIsModal style={styles.sheetBody}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {title}
            </Text>
            <Text style={styles.sheetDescription}>{description}</Text>
            <MutationError error={error} />
            <Button
              label={confirmLabel}
              loading={pending}
              onPress={onConfirm}
              variant={destructive ? "danger" : "primary"}
            />
            <Button disabled={pending} label="Bekor qilish" onPress={onCancel} variant="secondary" />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const FLASH_DURATION_MS = 6000;

/** Shows the one-shot success message left by the previous (form) screen. */
export function FlashBanner() {
  useSessionContext();
  const flash = useUiStore((state) => state.flash);
  const notices = useUiStore((state) => state.contextNotices);
  const clearNotices = useUiStore((state) => state.clearContextNotice);
  const clearFlash = useUiStore((state) => state.clearFlash);

  useEffect(() => {
    if (!flash) {
      return undefined;
    }

    const timeout = setTimeout(() => clearFlash(flash.id), FLASH_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [clearFlash, flash]);

  const currentNotices = notices.filter((notice) => sameSession(notice.origin));
  if (!currentNotices.length && (!flash || !isContextCurrent(flash.origin))) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      {currentNotices.map((notice) => <Banner key={notice.id} message={notice.message} tone="warning" />)}
      {currentNotices.length ? <Button label="Xabarlarni yopish" onPress={clearNotices} variant="secondary" /> : null}
      {flash && isContextCurrent(flash.origin) ? <Banner message={flash.message} tone="success" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    fontSize: typography.body,
    fontWeight: "800",
  },
  bannerMessage: {
    fontSize: typography.caption + 1,
    lineHeight: 20,
  },
  denied: {
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningSurface,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  skeletonList: {
    gap: spacing.md,
  },
  skeletonCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surfaceRaised,
  },
  skeletonLineWide: {
    width: "70%",
  },
  skeletonLineNarrow: {
    width: "40%",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay,
  },
  overlayDismiss: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sheetBody: {
    gap: spacing.md,
    padding: spacing.xl,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "800",
  },
  sheetDescription: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
