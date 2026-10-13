import { normalizeDecimalInput } from "@paypoq/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useCreateAndActivateSpecification, useMachineLookupsQuery } from "@/lib/api/machines";
import { routes } from "@/lib/routes";
import { colors, spacing, typography } from "@/shared/styles/theme";
import { Button, SelectField, TextField } from "@/shared/ui/controls";
import { Banner, MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Card } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { useUiStore } from "@/stores/ui-store";

interface MetricDraft {
  code: string;
  name: string;
  unit: string;
  min: string;
  target: string;
  max: string;
}

const emptyMetric: MetricDraft = { code: "", name: "", unit: "cm", min: "", target: "", max: "" };

export default function MeasurementSpecRoute() {
  return (
    <AreaGuard
      area="machines"
      backTo={routes.machines}
      endpoint="machinesCreateSpecification"
      title="O'lchov me'yorlari"
    >
      <MeasurementSpecForm />
    </AreaGuard>
  );
}

/** Returns the first problem with a metric row, or null when it can be sent. */
function metricError(metric: MetricDraft): string | null {
  if (!metric.code.trim() || !metric.name.trim() || !metric.unit.trim()) {
    return "Kod, nom va birlik to'ldirilishi kerak.";
  }

  const [min, target, max] = [metric.min, metric.target, metric.max].map(normalizeDecimalInput);
  if (min === null || target === null || max === null) {
    return "Eng kam, maqsad va eng ko'p qiymatlar son bo'lishi kerak.";
  }

  // Same rule the API enforces; checked here only to explain it before sending.
  if (Number(min) > Number(target) || Number(target) > Number(max)) {
    return "Eng kam ≤ maqsad ≤ eng ko'p bo'lishi kerak.";
  }

  return null;
}

function MeasurementSpecForm() {
  const router = useRouter();
  const showFlash = useUiStore((state) => state.showFlash);
  const lookupsQuery = useMachineLookupsQuery();
  const mutation = useCreateAndActivateSpecification();
  const [productId, setProductId] = useState("");
  const [metrics, setMetrics] = useState<MetricDraft[]>([
    { ...emptyMetric, code: "TOTAL_LENGTH", name: "Umumiy uzunlik" },
  ]);
  const [showErrors, setShowErrors] = useState(false);

  const metricErrors = metrics.map(metricError);
  const hasErrors = !productId || metricErrors.some(Boolean);

  function updateMetric(index: number, patch: Partial<MetricDraft>) {
    setMetrics((current) =>
      current.map((metric, position) => (position === index ? { ...metric, ...patch } : metric)),
    );
  }

  async function submit() {
    setShowErrors(true);
    if (hasErrors) {
      return;
    }

    try {
      const result = await mutation.submit({
        productId,
        metrics: metrics.map((metric, index) => ({
          code: metric.code.trim(),
          name: metric.name.trim(),
          unit: metric.unit.trim(),
          // The API contract takes measurement limits as JSON numbers.
          min: Number(normalizeDecimalInput(metric.min)),
          target: Number(normalizeDecimalInput(metric.target)),
          max: Number(normalizeDecimalInput(metric.max)),
          displayOrder: index + 1,
        })),
      });
      if (!result) return;

      showFlash("O'lchov me'yorlari yaratildi va faollashtirildi.");
      router.back();
    } catch {
      // The API message is rendered from mutation.error; the form keeps its values.
    }
  }

  return (
    <Screen
      backTo={routes.machines}
      eyebrow="Stanok ishi"
      footer={
        <>
          <MutationError error={mutation.error} />
          <Button
            label="Me'yorlarni yaratish va faollashtirish"
            loading={mutation.isPending}
            onPress={() => void submit()}
          />
        </>
      }
      subtitle="Sifat tekshiruvida o'lchanadigan qiymatlar va ruxsat etilgan chegaralar."
      title="Mahsulot o'lchov me'yorlari"
    >
      <QueryState queries={[lookupsQuery]}>
        <Banner
          message="Yangi me'yor faollashganda shu mahsulotning oldingi me'yori arxivlanadi."
          tone="info"
        />

        <SelectField
          emptyText="Mahsulot modeli yo'q."
          error={showErrors && !productId ? "Mahsulot modeli tanlanishi kerak." : null}
          label="Mahsulot modeli"
          onChange={setProductId}
          options={(lookupsQuery.data?.products ?? []).map((product) => ({
            value: product.id,
            label: product.name,
          }))}
          required
          value={productId}
        />

        {metrics.map((metric, index) => (
          <Card key={index}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>{`${index + 1}-o'lchov`}</Text>
              {metrics.length > 1 ? (
                <View style={styles.removeButton}>
                  <Button
                    disabled={mutation.isPending}
                    label="Olib tashlash"
                    onPress={() =>
                      setMetrics((current) => current.filter((_, position) => position !== index))
                    }
                    variant="secondary"
                  />
                </View>
              ) : null}
            </View>
            <TextField
              autoCapitalize="characters"
              label="Kod"
              onChangeText={(text) => updateMetric(index, { code: text })}
              placeholder="TOTAL_LENGTH"
              required
              value={metric.code}
            />
            <TextField
              label="Nomi"
              onChangeText={(text) => updateMetric(index, { name: text })}
              placeholder="Umumiy uzunlik"
              required
              value={metric.name}
            />
            <TextField
              autoCapitalize="none"
              label="Birlik"
              onChangeText={(text) => updateMetric(index, { unit: text })}
              placeholder="cm"
              required
              value={metric.unit}
            />
            <TextField
              keyboardType="decimal-pad"
              label="Eng kam"
              onChangeText={(text) => updateMetric(index, { min: text })}
              required
              value={metric.min}
            />
            <TextField
              keyboardType="decimal-pad"
              label="Maqsad"
              onChangeText={(text) => updateMetric(index, { target: text })}
              required
              value={metric.target}
            />
            <TextField
              keyboardType="decimal-pad"
              label="Eng ko'p"
              onChangeText={(text) => updateMetric(index, { max: text })}
              required
              value={metric.max}
            />
            {showErrors && metricErrors[index] ? (
              <Banner message={metricErrors[index] ?? ""} tone="error" />
            ) : null}
          </Card>
        ))}

        <Button
          disabled={mutation.isPending}
          icon="add"
          label="O'lchov qo'shish"
          onPress={() => setMetrics((current) => [...current, { ...emptyMetric }])}
          variant="secondary"
        />
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  metricTitle: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  removeButton: {
    minWidth: 150,
  },
});
