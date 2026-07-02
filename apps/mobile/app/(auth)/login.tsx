import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getUserFacingErrorMessage } from "@/lib/api/errors";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const isLoadingSession = useAuthStore((state) => state.isLoadingSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogin() {
    setErrorMessage(null);

    try {
      await login(email.trim(), password);
    } catch (error) {
      setErrorMessage(getUserFacingErrorMessage(error));
    }
  }

  const isDisabled = isLoadingSession || !email.trim() || !password;

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.screen}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Paypoq Mobile</Text>
          <Text style={styles.title}>Kirish</Text>
          <Text style={styles.subtitle}>
            Mavjud Paypoq OS akkauntingiz bilan tizimga kiring.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="owner@paypoq.local"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              textContentType="username"
              value={email}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Parol</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Parol"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={styles.input}
              textContentType="password"
              value={password}
            />
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={isDisabled}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.button,
              isDisabled && styles.buttonDisabled,
              pressed && !isDisabled && styles.buttonPressed,
            ]}
          >
            {isLoadingSession ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text style={styles.buttonText}>Kirish</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  card: {
    gap: spacing.xl,
  },
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
  form: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: typography.body,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.dangerSurface,
  },
  errorText: {
    color: colors.dangerText,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: typography.body,
    fontWeight: "800",
  },
});

