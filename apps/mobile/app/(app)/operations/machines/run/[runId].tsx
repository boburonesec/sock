import { parsePositiveInteger } from "@paypoq/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";

import { runStatusTone, statusLabel } from "@/features/machines/format";
import { useAccess } from "@/lib/access/use-access";
import { useChangeRunStatus, useCreateRunIntake, useProductionRunsQuery } from "@/lib/api/production";
import { routes } from "@/lib/routes";
import { Button, TextField } from "@/shared/ui/controls";
import { Badge, Banner, ConfirmSheet, MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Card, KeyValueList, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatDateTime, formatQuantity } from "@/shared/utils/format";
import { resolveAttemptKey, type AttemptKey } from "@/shared/utils/idempotency";
import { useUiStore } from "@/stores/ui-store";

export default function ProductionRunRoute() {
  return (
    <AreaGuard area="machines" backTo={routes.machines} endpoint="productionRuns" title="Stanok ishi">
      <ProductionRunDetail />
    </AreaGuard>
  );
}

function ProductionRunDetail() {
  const router = useRouter();
  const access = useAccess();
  const showFlash = useUiStore((state) => state.showFlash);
  const { runId } = useLocalSearchParams<{ runId: string }>();
  const runsQuery = useProductionRunsQuery();
  const intake = useCreateRunIntake();
  const changeStatus = useChangeRunStatus();
  const [quantityText, setQuantityText] = useState("");
  const [showError, setShowError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);
  // Kept while the operator re-taps the button without editing the quantity,
  // so a timed-out request that did reach the server is not recorded twice.
  // Any edit starts a new attempt: typing the amount again is a new intake.
  const attempt = useRef<AttemptKey | null>(null);

  const run = (runsQuery.data ?? []).find((item) => item.id === runId);
  const canIntake = access.can("productionCreateRunIntake");
  const canComplete = access.can("productionChangeRunStatus");
  const quantity = parsePositiveInteger(quantityText);
  const isRunning = run?.status === "RUNNING";

  async function submitIntake() {
    setShowError(true);
    setMessage(null);
    if (!run || quantity === null) {
      return;
    }

    attempt.current = resolveAttemptKey(attempt.current, `${run.id}:${quantity}`);

    try {
      const result = await intake.submit({
        id: run.id,
        quantity,
        idempotencyKey: attempt.current.key,
      });
      if (!result) return;

      attempt.current = null;
      setQuantityText("");
      setShowError(false);
      setMessage(`${formatQuantity(result.quantity, "dona")} ishlab chiqarilgan mahsulot qabul qilindi.`);
    } catch {
      // The key is kept: retrying the same quantity is safe.
    }
  }

  async function completeRun() {
    if (!run) return;

    try {
      const result = await changeStatus.submit({ id: run.id, status: "COMPLETED" });
      if (!result) return;

      setConfirmComplete(false);
      showFlash("Stanok ishi yakunlandi.");
      router.back();
    } catch {
      // The confirmation sheet stays open and shows the API error.
    }
  }

  return (
    <Screen
      backTo={routes.machines}
      eyebrow="Stanok ishi"
      onRefresh={() => void runsQuery.refetch()}
      refreshing={runsQuery.isRefetching}
      subtitle={run ? `${run.productVariant.product.name} · ${run.productVariant.color.name}` : undefined}
      title={run?.machine.code ?? "Stanok ishi"}
    >
      <QueryState queries={[runsQuery]}>
        {!run ? (
          <EmptyState
            description="Bu ish so'nggi ishlar ro'yxatida yo'q. Ro'yxatni yangilab qayta urining."
            title="Stanok ishi topilmadi"
          />
        ) : (
          <>
            <Card tone="accent">
              <Badge label={statusLabel(run.status)} tone={runStatusTone[run.status] ?? "info"} />
              <KeyValueList
                items={[
                  { label: "Stanok", value: `${run.machine.code} · ${run.machine.name}` },
                  { label: "Operator", value: run.operator.name },
                  { label: "Mexanik", value: run.mechanic.name },
                  { label: "Smena", value: run.workShift.name },
                  { label: "Boshlangan", value: formatDateTime(run.startedAt) },
                ]}
              />
            </Card>

            {message ? <Banner message={message} tone="success" /> : null}

            {canIntake ? (
              <Section
                description="Qabul qilingan miqdor birinchi bosqich qoldig'iga qo'shiladi va mexanik hamda operatorga ishbay yoziladi."
                title="Chiqqan mahsulotni qabul qilish"
              >
                {!isRunning ? (
                  <Banner
                    message="Faqat «Ishlamoqda» holatidagi ishdan mahsulot qabul qilinadi."
                    tone="warning"
                  />
                ) : null}
                <TextField
                  editable={isRunning}
                  error={
                    showError && quantity === null ? "Miqdor 0 dan katta butun son bo'lishi kerak." : null
                  }
                  keyboardType="number-pad"
                  label="Stanokdan chiqqan mahsulot soni"
                  onChangeText={(text) => {
                    attempt.current = null;
                    setQuantityText(text.replace(/[^\d]/g, ""));
                  }}
                  placeholder="Chiqqan dona"
                  required
                  value={quantityText}
                />
                <MutationError error={intake.error} />
                <Button
                  disabled={!isRunning}
                  label="Chiqqan mahsulotni qabul qilish"
                  loading={intake.isPending}
                  onPress={() => void submitIntake()}
                />
              </Section>
            ) : null}

            {canComplete ? (
              <Section
                description="Yakunlangandan so'ng bu ish uchun yangi mahsulot qabul qilib bo'lmaydi."
                title="Ishni yakunlash"
              >
                <Button
                  disabled={!isRunning || intake.isPending}
                  label="Ishni yakunlash"
                  onPress={() => {
                    changeStatus.reset();
                    setConfirmComplete(true);
                  }}
                  variant="danger"
                />
              </Section>
            ) : null}
          </>
        )}
      </QueryState>

      <ConfirmSheet
        confirmLabel="Ha, ishni yakunlash"
        description={
          run
            ? `${run.machine.code} uchun ishlab chiqarish jarayoni yakunlangan deb belgilanadi. Bu amalni ortga qaytarib bo'lmaydi — yakunlangandan so'ng bu ish uchun yangi mahsulot qabul qilib bo'lmaydi.`
            : ""
        }
        destructive
        error={changeStatus.error}
        onCancel={() => {
          setConfirmComplete(false);
          changeStatus.reset();
        }}
        onConfirm={() => void completeRun()}
        pending={changeStatus.isPending}
        title="Stanok ishini yakunlaysizmi?"
        visible={confirmComplete}
      />
    </Screen>
  );
}
