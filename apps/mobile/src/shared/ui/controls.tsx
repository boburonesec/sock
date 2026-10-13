import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, spacing, touchTarget, typography } from "@/shared/styles/theme";
import { shiftIsoDate } from "@/shared/utils/format";

// --- Button ----------------------------------------------------------------

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Button({ label, onPress, variant = "primary", loading, disabled, icon }: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  const textColor =
    variant === "primary" ? colors.buttonText : variant === "danger" ? colors.dangerText : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons color={textColor} name={icon} size={20} /> : null}
          <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// --- Field wrapper ---------------------------------------------------------

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string | null;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// --- Text / number input ---------------------------------------------------

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  hint?: string | null;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  editable?: boolean;
  autoCapitalize?: "none" | "sentences" | "characters";
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  error,
  hint,
  keyboardType,
  multiline,
  editable = true,
  autoCapitalize = "sentences",
}: TextFieldProps) {
  return (
    <Field error={error} hint={hint} label={label} required={required}>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        editable={editable}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          !editable && styles.inputLocked,
          Boolean(error) && styles.inputError,
        ]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
      />
    </Field>
  );
}

// --- Select (bottom sheet with search) -------------------------------------

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  hint?: string | null;
  disabled?: boolean;
  /** Adds an explicit "not selected" row for optional fields. */
  clearLabel?: string;
  emptyText?: string;
}

const SEARCH_THRESHOLD = 8;

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Tanlang",
  required,
  error,
  hint,
  disabled,
  clearLabel,
  emptyText = "Tanlash uchun ma'lumot yo'q.",
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.value === value);
  const visibleOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? options.filter((option) =>
          `${option.label} ${option.description ?? ""}`.toLowerCase().includes(term),
        )
      : options;

    return clearLabel ? [{ value: "", label: clearLabel }, ...filtered] : filtered;
  }, [clearLabel, options, search]);

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setSearch("");
  }

  return (
    <Field error={error} hint={hint} label={label} required={required}>
      <Pressable
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.input,
          styles.select,
          pressed && styles.pressed,
          disabled && styles.disabled,
          Boolean(error) && styles.inputError,
        ]}
      >
        <Text numberOfLines={2} style={[styles.selectText, !selected && styles.placeholder]}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons color={colors.textMuted} name="chevron-down" size={20} />
      </Pressable>

      <Modal animationType="slide" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel="Yopish"
            onPress={() => setOpen(false)}
            style={styles.overlayDismiss}
          />
          <SafeAreaView edges={["bottom"]} style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable
                accessibilityLabel="Yopish"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setOpen(false)}
              >
                <Ionicons color={colors.textMuted} name="close" size={24} />
              </Pressable>
            </View>

            {options.length > SEARCH_THRESHOLD ? (
              <TextInput
                accessibilityLabel="Qidirish"
                autoCapitalize="none"
                onChangeText={setSearch}
                placeholder="Qidirish"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.sheetSearch]}
                value={search}
              />
            ) : null}

            <FlatList
              ListEmptyComponent={<Text style={styles.sheetEmpty}>{emptyText}</Text>}
              data={visibleOptions}
              keyExtractor={(option) => option.value || "__none"}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.value === value;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => choose(item.value)}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.optionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.optionText}>
                      <Text style={styles.optionLabel}>{item.label}</Text>
                      {item.description ? (
                        <Text style={styles.optionDescription}>{item.description}</Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Ionicons color={colors.accent} name="checkmark" size={22} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </Field>
  );
}

// --- Segmented control -----------------------------------------------------

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.segmented}>
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.segment,
                isSelected && styles.segmentSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.segmentText, isSelected && styles.segmentTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// --- Checkbox row ----------------------------------------------------------

export function CheckRow({
  label,
  checked,
  onToggle,
  disabled,
  children,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** Rendered to the right of the label when checked (e.g. a quantity input). */
  children?: ReactNode;
}) {
  return (
    <View style={[styles.checkRow, checked && styles.checkRowChecked]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={onToggle}
        style={({ pressed }) => [styles.checkPress, pressed && styles.pressed]}
      >
        <Ionicons
          color={checked ? colors.accent : colors.textMuted}
          name={checked ? "checkbox" : "square-outline"}
          size={24}
        />
        <Text style={styles.checkLabel}>{label}</Text>
      </Pressable>
      {checked ? children : null}
    </View>
  );
}

// --- Day stepper -----------------------------------------------------------

/** Picks a calendar day (YYYY-MM-DD) with previous/next/today — no native date picker dependency. */
export function DayStepper({
  label,
  value,
  onChange,
  displayValue,
  today,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  displayValue: string;
  /** The day "today" resets to; the caller decides which calendar the API uses. */
  today: string;
}) {

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityLabel="Oldingi kun"
          accessibilityRole="button"
          onPress={() => onChange(shiftIsoDate(value, -1))}
          style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.text} name="chevron-back" size={22} />
        </Pressable>
        <View style={styles.stepValue}>
          <Text style={styles.stepValueText}>{displayValue}</Text>
          {value !== today ? (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onChange(today)}>
              <Text style={styles.stepToday}>Bugunga qaytish</Text>
            </Pressable>
          ) : (
            <Text style={styles.hint}>Bugun</Text>
          )}
        </View>
        <Pressable
          accessibilityLabel="Keyingi kun"
          accessibilityRole="button"
          onPress={() => onChange(shiftIsoDate(value, 1))}
          style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.text} name="chevron-forward" size={22} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  button: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.accent,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  buttonDanger: {
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerSurface,
  },
  buttonText: {
    fontSize: typography.body,
    fontWeight: "800",
    textAlign: "center",
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  required: {
    color: colors.danger,
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  fieldError: {
    color: colors.dangerText,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  input: {
    minHeight: touchTarget + 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.body,
    backgroundColor: colors.surface,
  },
  inputMultiline: {
    minHeight: 96,
  },
  inputLocked: {
    color: colors.textMuted,
    backgroundColor: colors.surfaceRaised,
  },
  inputError: {
    borderColor: colors.dangerBorder,
  },
  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  selectText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
  },
  placeholder: {
    color: colors.textMuted,
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
    maxHeight: "80%",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.lg,
  },
  sheetTitle: {
    flex: 1,
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "800",
  },
  sheetSearch: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceRaised,
  },
  sheetEmpty: {
    padding: spacing.lg,
    color: colors.textMuted,
    fontSize: typography.body,
    textAlign: "center",
  },
  option: {
    minHeight: touchTarget + 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  optionSelected: {
    backgroundColor: colors.accentSurface,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    color: colors.text,
    fontSize: typography.body,
  },
  optionDescription: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  segmented: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 4,
    backgroundColor: colors.surface,
  },
  segment: {
    flex: 1,
    minHeight: touchTarget - 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md - 2,
    paddingHorizontal: spacing.sm,
  },
  segmentSelected: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "800",
    textAlign: "center",
  },
  segmentTextSelected: {
    color: colors.buttonText,
  },
  checkRow: {
    minHeight: touchTarget + 4,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  checkRowChecked: {
    borderColor: colors.accent,
  },
  checkPress: {
    flex: 1,
    minHeight: touchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkLabel: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepButton: {
    width: touchTarget + 4,
    height: touchTarget + 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  stepValue: {
    flex: 1,
    minHeight: touchTarget + 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  stepValueText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  stepToday: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "700",
  },
});
