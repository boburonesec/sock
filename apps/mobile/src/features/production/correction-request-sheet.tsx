import { MIN_REASON_LENGTH, type CorrectionDomain } from "@paypoq/shared";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCreateCorrectionRequest } from "@/lib/api/recovery";
import { colors, radius, spacing, typography } from "@/shared/styles/theme";
import { Button, TextField } from "@/shared/ui/controls";
import { Banner, MutationError } from "@/shared/ui/feedback";
import { KeyValueList } from "@/shared/ui/lists";

export interface CorrectionTarget {
  domain: CorrectionDomain;
  sourceRecordId: string;
  title: string;
  details: { label: string; value: string }[];
}

/**
 * "Xatoni bildirish": the original record is never edited. The operator
 * describes the mistake and a manager reviews the request.
 */
export function CorrectionRequestSheet({
  target,
  onClose,
}: {
  target: CorrectionTarget | null;
  onClose: () => void;
}) {
  const mutation = useCreateCorrectionRequest();
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<string | null>(null);

  function close() {
    if (mutation.isPending) return;
    setReason("");
    setResult(null);
    mutation.reset();
    onClose();
  }

  async function submit() {
    if (!target) return;

    try {
      const created = await mutation.submit({
        domain: target.domain,
        sourceRecordId: target.sourceRecordId,
        reason: reason.trim(),
      });
      if (!created) return;

      setReason("");
      setResult(
        `So'rov yuborildi. Holat: Manager ko'rib chiqishini kutmoqda. Raqam: ${created.id.slice(0, 8)}`,
      );
    } catch {
      // The API message is rendered from mutation.error; the reason stays typed in.
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={close} transparent visible={Boolean(target)}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.overlay}
      >
        <Pressable accessibilityLabel="Yopish" onPress={close} style={styles.dismiss} />
        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          <View style={styles.body}>
            <Text accessibilityRole="header" style={styles.title}>
              Xatoni bildirish
            </Text>
            <Text style={styles.description}>
              {"Asl yozuv o'zgarmaydi. So'rovni Manager ko'rib chiqadi."}
            </Text>

            {target ? (
              <View style={styles.source}>
                <Text style={styles.sourceTitle}>{target.title}</Text>
                <KeyValueList items={target.details} />
              </View>
            ) : null}

            {result ? (
              <Banner message={result} tone="success" />
            ) : (
              <TextField
                label="Xato sababi"
                multiline
                onChangeText={setReason}
                placeholder="Nima xato va qanday bo'lishi kerak?"
                required
                value={reason}
              />
            )}

            <MutationError error={mutation.error} />

            {!result ? (
              <Button
                disabled={reason.trim().length < MIN_REASON_LENGTH}
                label="Managerga yuborish"
                loading={mutation.isPending}
                onPress={() => void submit()}
              />
            ) : null}
            <Button disabled={mutation.isPending} label="Yopish" onPress={close} variant="secondary" />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay,
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  body: {
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "800",
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  source: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceRaised,
  },
  sourceTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
});
