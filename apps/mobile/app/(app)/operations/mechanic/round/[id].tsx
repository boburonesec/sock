import { ACTIONABLE_INSPECTION_ROUND_STATUSES } from "@paypoq/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import { roundStatusTone, statusLabel } from "@/features/machines/format";
import { MeasurementInputs, buildMeasurements } from "@/features/machines/measurement-inputs";
import { useInspectionRoundsQuery, useSubmitMeasurements } from "@/lib/api/machines";
import { routes } from "@/lib/routes";
import { Button } from "@/shared/ui/controls";
import { Badge, Banner, MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Card, KeyValueList } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatDateTime } from "@/shared/utils/format";
import { useUiStore } from "@/stores/ui-store";

export default function InspectionRoundRoute() {
  return (
    <AreaGuard
      area="mechanic"
      backTo={routes.mechanic}
      endpoint="machinesSubmitMeasurements"
      title="O'lchov"
    >
      <InspectionRoundForm />
    </AreaGuard>
  );
}

function InspectionRoundForm() {
  const router = useRouter();
  const showFlash = useUiStore((state) => state.showFlash);
  const { id } = useLocalSearchParams<{ id: string }>();
  const roundsQuery = useInspectionRoundsQuery();
  const mutation = useSubmitMeasurements();
  const [values, setValues] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);

  const round = (roundsQuery.data ?? []).find((item) => item.id === id);
  const actionable = round ? ACTIONABLE_INSPECTION_ROUND_STATUSES.includes(round.status) : false;

  async function submit() {
    if (!round) return;
    setShowErrors(true);
    const measurements = buildMeasurements(round.specification.metrics, values);
    if (!measurements) {
      return;
    }

    try {
      const result = await mutation.submit({ roundId: round.id, measurements });
      if (!result) return;

      showFlash(
        result.status === "ATTENTION"
          ? "O'lchov saqlandi. Qiymatlar me'yordan tashqarida — qayta tekshiruv belgilandi."
          : "O'lchov saqlandi.",
      );
      router.back();
    } catch {
      // The API message is rendered from mutation.error; entered values stay.
    }
  }

  return (
    <Screen
      backTo={routes.mechanic}
      eyebrow="Mexanik ish maydoni"
      footer={
        round && actionable ? (
          <>
            <MutationError error={mutation.error} />
            <Button label="O'lchovni saqlash" loading={mutation.isPending} onPress={() => void submit()} />
          </>
        ) : undefined
      }
      onRefresh={() => void roundsQuery.refetch()}
      refreshing={roundsQuery.isRefetching}
      subtitle={round ? formatDateTime(round.scheduledAt) : undefined}
      title={round ? `${round.machine.code} · o'lchov` : "O'lchov"}
    >
      <QueryState queries={[roundsQuery]}>
        {!round ? (
          <EmptyState
            description="Bu tekshiruv bugungi ro'yxatda yo'q yoki sizga biriktirilmagan."
            title="Tekshiruv topilmadi"
          />
        ) : (
          <>
            <Card tone="accent">
              <Badge label={statusLabel(round.status)} tone={roundStatusTone[round.status] ?? "info"} />
              <KeyValueList
                items={[
                  { label: "Stanok", value: round.machine.code },
                  { label: "Mahsulot", value: round.productionRun.productVariant.product.name },
                  { label: "Reja vaqti", value: formatDateTime(round.scheduledAt) },
                ]}
              />
            </Card>

            {actionable ? (
              <MeasurementInputs
                disabled={mutation.isPending}
                metrics={round.specification.metrics}
                onChange={(metricId, value) => setValues((current) => ({ ...current, [metricId]: value }))}
                showErrors={showErrors}
                values={values}
              />
            ) : (
              <Banner
                message={`Bu tekshiruv yakunlangan: ${round.measurements.length} ta o'lchov kiritilgan.`}
                tone="info"
              />
            )}
          </>
        )}
      </QueryState>
    </Screen>
  );
}
