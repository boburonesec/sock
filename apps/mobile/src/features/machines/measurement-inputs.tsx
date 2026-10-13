import { normalizeDecimalInput, type MeasurementMetric, type MeasurementValuePayload } from "@paypoq/shared";

import { TextField } from "@/shared/ui/controls";

/** One decimal input per metric, showing the allowed range the API will judge against. */
export function MeasurementInputs({
  metrics,
  values,
  onChange,
  showErrors,
  disabled,
}: {
  metrics: MeasurementMetric[];
  values: Record<string, string>;
  onChange: (metricId: string, value: string) => void;
  showErrors: boolean;
  disabled?: boolean;
}) {
  return (
    <>
      {metrics.map((metric) => (
        <TextField
          editable={!disabled}
          error={
            showErrors && normalizeDecimalInput(values[metric.id] ?? "") === null
              ? "O'lchangan qiymatni son bilan kiriting."
              : null
          }
          hint={`Norma ${metric.min}–${metric.max}, maqsad ${metric.target}`}
          key={metric.id}
          keyboardType="decimal-pad"
          label={`${metric.name} (${metric.unit})`}
          onChangeText={(text) => onChange(metric.id, text)}
          required
          value={values[metric.id] ?? ""}
        />
      ))}
    </>
  );
}

/**
 * Builds the payload when every metric has a valid value, otherwise null.
 * The API takes measurements as JSON numbers; whether a value is within
 * range is decided by the API, never here.
 */
export function buildMeasurements(
  metrics: MeasurementMetric[],
  values: Record<string, string>,
): MeasurementValuePayload[] | null {
  const measurements: MeasurementValuePayload[] = [];

  for (const metric of metrics) {
    const normalized = normalizeDecimalInput(values[metric.id] ?? "");
    if (normalized === null) {
      return null;
    }
    measurements.push({ metricId: metric.id, value: Number(normalized) });
  }

  return measurements;
}
