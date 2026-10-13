import { Ionicons } from "@expo/vector-icons";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radius, spacing, touchTarget, typography } from "@/shared/styles/theme";

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeading}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {title}
          </Text>
          {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Card({ children, tone }: { children: ReactNode; tone?: "default" | "accent" | "warning" }) {
  return (
    <View
      style={[styles.card, tone === "accent" && styles.cardAccent, tone === "warning" && styles.cardWarning]}
    >
      {children}
    </View>
  );
}

interface ListRowProps {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  /** Prominent value on the right (quantity, status). */
  value?: string | null;
  badge?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  footer?: ReactNode;
}

/** Card-style list row. Tappable rows show a chevron and meet the touch target. */
export function ListRow({ title, subtitle, meta, value, badge, onPress, selected, footer }: ListRowProps) {
  const body = (
    <>
      <View style={styles.rowMain}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
          {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
          {badge}
        </View>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {onPress ? <Ionicons color={colors.textMuted} name="chevron-forward" size={20} /> : null}
      </View>
      {footer}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, selected && styles.rowSelected]}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

/** Label/value pairs for detail screens and pre-submit review blocks. */
export function KeyValueList({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={styles.keyValueList}>
      {items.map((item) => (
        <View key={item.label} style={styles.keyValue}>
          <Text style={styles.keyLabel}>{item.label}</Text>
          <Text style={styles.keyValueText}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = "Qidirish",
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.search}>
      <Ionicons color={colors.textMuted} name="search" size={18} />
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.searchInput}
        value={value}
      />
      {value ? (
        <Pressable
          accessibilityLabel="Qidiruvni tozalash"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => onChangeText("")}
        >
          <Ionicons color={colors.textMuted} name="close-circle" size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Large navigation/action tile for hubs and quick actions. */
export function ActionTile({
  title,
  subtitle,
  icon,
  onPress,
  primary,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, primary && styles.tilePrimary, pressed && styles.pressed]}
    >
      <View style={styles.tileIcon}>
        <Ionicons color={colors.accent} name={icon} size={22} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionHeading: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "800",
  },
  sectionDescription: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  card: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  cardAccent: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSurface,
  },
  cardWarning: {
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningSurface,
  },
  row: {
    minHeight: touchTarget + 8,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  rowSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSurface,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption + 1,
    lineHeight: 19,
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  rowValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
    textAlign: "right",
  },
  keyValueList: {
    gap: spacing.sm,
  },
  keyValue: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  keyLabel: {
    flexShrink: 0,
    maxWidth: "45%",
    color: colors.textMuted,
    fontSize: typography.caption + 1,
  },
  keyValueText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.caption + 1,
    fontWeight: "700",
    textAlign: "right",
  },
  search: {
    minHeight: touchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    minHeight: touchTarget,
    color: colors.text,
    fontSize: typography.body,
  },
  tile: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  tilePrimary: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSurface,
  },
  tileIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
});
