import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import { statusLabel } from "@/features/machines/format";
import { MeasurementInputs, buildMeasurements } from "@/features/machines/measurement-inputs";
import { useAccess } from "@/lib/access/use-access";
import { useHoldIssueRun, useQualityIssuesQuery, useRecheckIssue } from "@/lib/api/machines";
import { routes } from "@/lib/routes";
import { Button } from "@/shared/ui/controls";
import { Badge, ConfirmSheet, MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Card, KeyValueList } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatDateTime } from "@/shared/utils/format";
import { useUiStore } from "@/stores/ui-store";

export default function QualityIssueRoute() {
  return (
    <AreaGuard
      area="mechanic"
      backTo={routes.mechanic}
      endpoint="machinesRecheckIssue"
      title="Qayta tekshiruv"
    >
      <QualityIssueForm />
    </AreaGuard>
  );
}

function QualityIssueForm() {
  const router = useRouter();
  const access = useAccess();
  const showFlash = useUiStore((state) => state.showFlash);
  const { id } = useLocalSearchParams<{ id: string }>();
  const issuesQuery = useQualityIssuesQuery();
  const recheck = useRecheckIssue();
  const hold = useHoldIssueRun();
  const [values, setValues] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [confirmHold, setConfirmHold] = useState(false);

  const issue = (issuesQuery.data ?? []).find((item) => item.id === id);
  const metrics = issue?.inspectionRound.specification.metrics ?? [];

  async function submit() {
    if (!issue) return;
    setShowErrors(true);
    const measurements = buildMeasurements(metrics, values);
    if (!measurements) {
      return;
    }

    try {
      const result = await recheck.submit({ issueId: issue.id, measurements });
      if (!result) return;

      showFlash(
        result.failed.length
          ? "Qayta o'lchov saqlandi. Muammo saqlanib qoldi — rahbar xabardor qilindi."
          : "Qayta o'lchov saqlandi.",
      );
      router.back();
    } catch {
      // The API message is rendered from recheck.error; entered values stay.
    }
  }

  async function holdRun() {
    if (!issue) return;

    try {
      const result = await hold.submit(issue.id);
      if (!result) return;

      setConfirmHold(false);
      showFlash("Ishlab chiqarish vaqtincha to'xtatildi.");
      router.back();
    } catch {
      // The confirmation sheet stays open and shows the API error.
    }
  }

  return (
    <Screen
      backTo={routes.mechanic}
      eyebrow="Mexanik ish maydoni"
      footer={
        issue ? (
          <>
            <MutationError error={recheck.error} />
            <Button label="Qayta o'lchash" loading={recheck.isPending} onPress={() => void submit()} />
            {access.can("machinesHoldIssueRun") ? (
              <Button
                disabled={recheck.isPending}
                label="Ishlab chiqarishni vaqtincha to'xtatish"
                onPress={() => {
                  hold.reset();
                  setConfirmHold(true);
                }}
                variant="danger"
              />
            ) : null}
          </>
        ) : undefined
      }
      onRefresh={() => void issuesQuery.refetch()}
      refreshing={issuesQuery.isRefetching}
      subtitle={issue ? `Muddat: ${formatDateTime(issue.recheckDueAt)}` : undefined}
      title={issue ? `${issue.machine.code} · qayta tekshiruv` : "Qayta tekshiruv"}
    >
      <QueryState queries={[issuesQuery]}>
        {!issue ? (
          <EmptyState
            description="Bu muammo hal qilingan yoki sizga biriktirilmagan."
            title="Qayta tekshiruv topilmadi"
          />
        ) : (
          <>
            <Card tone="warning">
              <Badge label={statusLabel(issue.status)} tone="error" />
              <KeyValueList
                items={[
                  { label: "Stanok", value: issue.machine.code },
                  { label: "Mexanik", value: issue.mechanic.name },
                  { label: "Ish holati", value: statusLabel(issue.productionRun.status) },
                  { label: "Muddat", value: formatDateTime(issue.recheckDueAt) },
                ]}
              />
            </Card>

            <MeasurementInputs
              disabled={recheck.isPending}
              metrics={metrics}
              onChange={(metricId, value) => setValues((current) => ({ ...current, [metricId]: value }))}
              showErrors={showErrors}
              values={values}
            />
          </>
        )}
      </QueryState>

      <ConfirmSheet
        confirmLabel="Ha, vaqtincha to'xtatish"
        description={
          issue
            ? `${issue.machine.code} stanogidagi joriy ishlab chiqarish to'xtatib turilgan holatga o'tadi. Davom ettirish boshqa boshqaruv amali orqali bajariladi.`
            : ""
        }
        destructive
        error={hold.error}
        onCancel={() => {
          setConfirmHold(false);
          hold.reset();
        }}
        onConfirm={() => void holdRun()}
        pending={hold.isPending}
        title="Ishlab chiqarishni vaqtincha to'xtatasizmi?"
        visible={confirmHold}
      />
    </Screen>
  );
}
