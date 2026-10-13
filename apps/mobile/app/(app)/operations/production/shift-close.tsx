import {
  MIN_REASON_LENGTH,
  currentWorkDate,
  type ShiftReadinessCheck,
  type ShiftReconciliationStatus,
} from "@paypoq/shared";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAccess } from "@/lib/access/use-access";
import {
  useAcceptShift,
  useConfigureWarehouseHandoffStage,
  useLookupWorkShiftsQuery,
  useOperationsSummaryQuery,
  useReturnShift,
  useShiftContextQuery,
  useShiftReadinessQuery,
  useShiftReconciliationsQuery,
  useSubmitShift,
  useWarehouseHandoffStageQuery,
} from "@/lib/api/production";
import { routes } from "@/lib/routes";
import { colors, spacing, typography } from "@/shared/styles/theme";
import { Button, DayStepper, SelectField, TextField } from "@/shared/ui/controls";
import { Badge, Banner, ConfirmSheet, MutationError, SkeletonList } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Card, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { ErrorState } from "@/shared/ui/states";
import { formatIsoDay } from "@/shared/utils/format";

const statusLabel: Record<ShiftReconciliationStatus, string> = {
  OPEN: "Ochiq",
  READY_FOR_HANDOVER: "Topshirishga tayyor",
  ACCEPTED: "Qabul qilingan",
};

const statusTone: Record<ShiftReconciliationStatus, "info" | "warning" | "success"> = {
  OPEN: "info",
  READY_FOR_HANDOVER: "warning",
  ACCEPTED: "success",
};

const checkGroups: {
  status: ShiftReadinessCheck["status"];
  title: string;
  tone: "error" | "warning" | "success";
}[] = [
  { status: "BLOCKER", title: "To'xtatadigan muammolar", tone: "error" },
  { status: "WARNING", title: "Ogohlantirishlar", tone: "warning" },
  { status: "READY", title: "Tayyor", tone: "success" },
];

export default function ShiftCloseRoute() {
  return (
    <AreaGuard area="production" backTo={routes.production} title="Smena yakuni">
      <ShiftClose />
    </AreaGuard>
  );
}

function ShiftClose() {
  const access = useAccess();
  const canSubmit = access.can("productionSubmitShift");
  // Web shows accept/return and the handoff setting to production.approve holders.
  const canApprove = access.can("productionAcceptShift");
  const canConfigure = access.can("productionConfigureWarehouseHandoffStage");

  const shiftsQuery = useLookupWorkShiftsQuery();
  const contextQuery = useShiftContextQuery();
  const recordsQuery = useShiftReconciliationsQuery();
  const handoffQuery = useWarehouseHandoffStageQuery();
  const summaryQuery = useOperationsSummaryQuery(canConfigure);

  const [workShiftId, setWorkShiftId] = useState("");
  const [workDate, setWorkDate] = useState(() => currentWorkDate());
  const [reason, setReason] = useState("");
  const [handoffStageId, setHandoffStageId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmAccept, setConfirmAccept] = useState(false);

  const readinessQuery = useShiftReadinessQuery(workShiftId, workDate);
  const submitShift = useSubmitShift();
  const acceptShift = useAcceptShift();
  const returnShift = useReturnShift();
  const configureHandoff = useConfigureWarehouseHandoffStage();

  // Preselect the shift assigned to the signed-in user, if any.
  const assignedShiftId = contextQuery.data?.currentWorkShift?.id;
  useEffect(() => {
    if (assignedShiftId) {
      setWorkShiftId((current) => current || assignedShiftId);
    }
  }, [assignedShiftId]);

  const record = (recordsQuery.data ?? []).find(
    (item) => item.workShiftId === workShiftId && item.workDate.slice(0, 10) === workDate,
  );
  const status: ShiftReconciliationStatus = record?.status ?? "OPEN";
  const checks = readinessQuery.data?.checks ?? [];
  const hasBlockers = Boolean(readinessQuery.data?.blockers.length);
  const reasonIsValid = reason.trim().length >= MIN_REASON_LENGTH;
  const isBusy = submitShift.isPending || acceptShift.isPending || returnShift.isPending;
  const actionError = submitShift.error ?? returnShift.error;

  function resetFeedback() {
    setMessage(null);
    submitShift.reset();
    acceptShift.reset();
    returnShift.reset();
    configureHandoff.reset();
  }

  async function run(kind: "submit" | "return") {
    resetFeedback();
    try {
      const result =
        kind === "submit"
          ? await submitShift.submit({ workShiftId, workDate })
          : await returnShift.submit({ workShiftId, workDate, reason: reason.trim() });
      if (!result) return;
      setReason("");
      setMessage(kind === "submit" ? "Smena topshirishga tayyor." : "Smena tuzatishga qaytarildi.");
    } catch {
      // Rendered from the mutation error below.
    }
  }

  async function accept() {
    try {
      const result = await acceptShift.submit({ workShiftId, workDate, reason: reason.trim() });
      if (!result) return;
      setReason("");
      setConfirmAccept(false);
      setMessage("Smena qabul qilindi.");
    } catch {
      // The confirmation sheet stays open and shows the API error.
    }
  }

  async function saveHandoffStage() {
    resetFeedback();
    try {
      const result = await configureHandoff.submit(handoffStageId);
      if (!result) return;
      setHandoffStageId("");
      setMessage("Omborga topshirish bosqichi saqlandi.");
    } catch {
      // Rendered from the mutation error below.
    }
  }

  return (
    <Screen
      backTo={routes.production}
      eyebrow="Ishlab chiqarish"
      onRefresh={() => {
        void shiftsQuery.refetch();
        void contextQuery.refetch();
        void recordsQuery.refetch();
        void handoffQuery.refetch();
        if (workShiftId) void readinessQuery.refetch();
      }}
      refreshing={recordsQuery.isRefetching || readinessQuery.isRefetching}
      subtitle="Ochiq ishlar va omborga topshirilmagan mahsulot bo'lsa smena qabul qilinmaydi."
      title="Smena yakuni"
    >
      <QueryState queries={[shiftsQuery, contextQuery, recordsQuery, handoffQuery]}>
        {message ? <Banner message={message} tone="success" /> : null}

        <SelectField
          emptyText="Smenalar sozlanmagan. Sozlamalarda smenalarni saqlang."
          label="Smena"
          onChange={(value) => {
            resetFeedback();
            setWorkShiftId(value);
          }}
          options={(shiftsQuery.data ?? []).map((shift) => ({ value: shift.id, label: shift.name }))}
          placeholder="Smenani tanlang"
          required
          value={workShiftId}
        />

        <DayStepper
          displayValue={formatIsoDay(workDate)}
          label="Ish sanasi"
          onChange={(value) => {
            resetFeedback();
            setWorkDate(value);
          }}
          today={currentWorkDate()}
          value={workDate}
        />

        {!contextQuery.data?.currentWorkShift && contextQuery.data?.message ? (
          <Banner message={contextQuery.data.message} tone="warning" />
        ) : null}

        <Card>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Holat</Text>
            <Badge label={statusLabel[status]} tone={statusTone[status]} />
          </View>
        </Card>

        {workShiftId ? (
          <Section title="Tayyorlik ro'yxati">
            {readinessQuery.isError ? (
              <ErrorState error={readinessQuery.error} onRetry={() => void readinessQuery.refetch()} />
            ) : readinessQuery.isLoading ? (
              <SkeletonList rows={3} />
            ) : (
              checkGroups.map((group) => {
                const items = checks.filter((item) => item.status === group.status);

                return (
                  <Card key={group.status}>
                    <View style={styles.statusRow}>
                      <Text style={styles.groupTitle}>{group.title}</Text>
                      <Badge label={String(items.length)} tone={items.length ? group.tone : "info"} />
                    </View>
                    {items.length === 0 ? <Text style={styles.muted}>{"Yo'q"}</Text> : null}
                    {items.map((item) => (
                      <View key={item.code} style={styles.check}>
                        <Text style={styles.checkLabel}>{item.label}</Text>
                        <Text style={styles.muted}>{item.detail}</Text>
                        {group.status !== "READY" ? (
                          <Text style={styles.checkAction}>Keyingi qadam: {item.action}</Text>
                        ) : null}
                      </View>
                    ))}
                  </Card>
                );
              })
            )}
          </Section>
        ) : (
          <Banner message="Tayyorlik ro'yxatini ko'rish uchun smenani tanlang." tone="info" />
        )}

        {canApprove ? (
          <TextField
            hint="Qabul qilish va qaytarish uchun kamida 3 belgili sabab kerak."
            label="Ogohlantirishni qabul qilish yoki qaytarish sababi"
            multiline
            onChangeText={setReason}
            placeholder="Sababni yozing"
            value={reason}
          />
        ) : null}

        <MutationError error={actionError} />

        {canSubmit ? (
          <Button
            disabled={!workShiftId || status === "ACCEPTED" || hasBlockers || isBusy}
            label="Topshirishga tayyor"
            loading={submitShift.isPending}
            onPress={() => void run("submit")}
          />
        ) : null}
        {canApprove ? (
          <>
            <Button
              disabled={
                !workShiftId || status !== "READY_FOR_HANDOVER" || hasBlockers || !reasonIsValid || isBusy
              }
              label="Qabul qilish"
              onPress={() => {
                resetFeedback();
                setConfirmAccept(true);
              }}
            />
            {access.can("productionReturnShift") ? (
              <Button
                disabled={!workShiftId || status !== "READY_FOR_HANDOVER" || !reasonIsValid || isBusy}
                label="Tuzatishga qaytarish"
                loading={returnShift.isPending}
                onPress={() => void run("return")}
                variant="secondary"
              />
            ) : null}
          </>
        ) : null}

        <Section title="Omborga topshirish bosqichi">
          <Card>
            <Text style={styles.groupTitle}>{handoffQuery.data?.name ?? "Sozlanmagan"}</Text>
            {handoffQuery.data === null ? (
              <Text style={styles.muted}>
                {canConfigure
                  ? "Birinchi smenani yopishdan oldin tayyor mahsulot omborga topshiriladigan bosqichni tanlang (odatda «Ombor»)."
                  : "Smenani yopish uchun Manager yoki Owner omborga topshirish bosqichini tanlashi kerak."}
              </Text>
            ) : null}
          </Card>

          {canConfigure ? (
            <>
              <SelectField
                label="Omborga topshirish bosqichini tanlash"
                onChange={setHandoffStageId}
                options={[...(summaryQuery.data?.stageTotals ?? [])]
                  .sort((first, second) => first.sortOrder - second.sortOrder)
                  .map((stage) => ({ value: stage.stageId, label: stage.stageName }))}
                placeholder="Bosqichni tanlang"
                value={handoffStageId}
              />
              <MutationError error={configureHandoff.error} />
              <Button
                disabled={!handoffStageId}
                label="Saqlash"
                loading={configureHandoff.isPending}
                onPress={() => void saveHandoffStage()}
                variant="secondary"
              />
            </>
          ) : null}
        </Section>
      </QueryState>

      <ConfirmSheet
        confirmLabel="Ha, smenani qabul qilish"
        description="Qabul qilingan smenani qayta ochib bo'lmaydi. Tayyorlik ro'yxati va sabab to'g'riligini tekshiring."
        error={acceptShift.error}
        onCancel={() => {
          setConfirmAccept(false);
          acceptShift.reset();
        }}
        onConfirm={() => void accept()}
        pending={acceptShift.isPending}
        title="Smenani qabul qilasizmi?"
        visible={confirmAccept}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  groupTitle: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption + 1,
    lineHeight: 20,
  },
  check: {
    gap: 3,
  },
  checkLabel: {
    color: colors.text,
    fontSize: typography.caption + 1,
    fontWeight: "700",
  },
  checkAction: {
    color: colors.text,
    fontSize: typography.caption + 1,
    lineHeight: 20,
  },
});
