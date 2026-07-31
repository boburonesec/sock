"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  machinesApi,
  type InspectionRound,
  type MaintenanceTask,
  type QualityIssue,
} from "@/lib/api/machines";
import { formatDateTimeForUser } from "@/lib/format";
import { formatVisibleStatusText } from "@/lib/status-labels";
import { useAuthStore } from "@/stores/auth-store";

type ActiveOperation =
  | { type: "round"; id: string }
  | { type: "issue"; id: string }
  | null;

const roundTone: Record<string, StatusTone> = {
  PENDING: "info",
  IN_PROGRESS: "warning",
  PASSED: "success",
  ATTENTION: "danger",
};

function operationKey(operation: ActiveOperation) {
  return operation ? `${operation.type}:${operation.id}` : "";
}

export function MechanicWorkspace() {
  const queryClient = useQueryClient();
  const tasks = useQuery({
    queryKey: ["mechanic", "tasks"],
    queryFn: machinesApi.tasks,
  });
  const rounds = useQuery({
    queryKey: ["mechanic", "rounds"],
    queryFn: machinesApi.rounds,
  });
  const issues = useQuery({
    queryKey: ["mechanic", "issues"],
    queryFn: machinesApi.issues,
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [activeOperation, setActiveOperation] =
    useState<ActiveOperation>(null);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [taskToComplete, setTaskToComplete] =
    useState<MaintenanceTask | null>(null);
  const [issueToHold, setIssueToHold] = useState<QualityIssue | null>(null);
  const inFlight = useRef(new Set<string>());
  const canHold = useAuthStore((state) =>
    state.permissions.includes("production.write"),
  );

  const submit = useMutation({
    mutationFn: ({
      id,
      metrics,
    }: {
      id: string;
      metrics: Array<{ metricId: string; value: number }>;
    }) => machinesApi.submitMeasurements(id, metrics),
  });
  const recheck = useMutation({
    mutationFn: ({
      id,
      metrics,
    }: {
      id: string;
      metrics: Array<{ metricId: string; value: number }>;
    }) => machinesApi.recheckIssue(id, metrics),
  });
  const updateTask = useMutation({
    mutationFn: ({
      id,
      status,
      resolution,
    }: {
      id: string;
      status: string;
      resolution?: string;
    }) => machinesApi.updateTask(id, { status, resolution }),
  });
  const hold = useMutation({ mutationFn: machinesApi.holdIssueRun });

  const allRounds = useMemo(() => rounds.data?.data ?? [], [rounds.data]);
  const allIssues = useMemo(() => issues.data?.data ?? [], [issues.data]);
  const allTasks = useMemo(() => tasks.data?.data ?? [], [tasks.data]);
  const runContexts = useMemo(() => {
    const byRun = new Map<
      string,
      { runId: string; machineCode: string; productName: string; status: string }
    >();
    for (const round of allRounds) {
      byRun.set(round.productionRun.id, {
        runId: round.productionRun.id,
        machineCode: round.machine.code,
        productName: round.productionRun.productVariant.product.name,
        status: round.productionRun.status,
      });
    }
    return Array.from(byRun.values());
  }, [allRounds]);

  useEffect(() => {
    if (!runContexts.length) {
      setSelectedRunId("");
      return;
    }
    if (!runContexts.some((context) => context.runId === selectedRunId)) {
      setSelectedRunId(runContexts[0].runId);
    }
  }, [runContexts, selectedRunId]);

  const contextRounds = useMemo(
    () =>
      allRounds.filter(
        (round) => round.productionRun.id === selectedRunId,
      ),
    [allRounds, selectedRunId],
  );
  const contextIssues = useMemo(
    () =>
      allIssues.filter(
        (issue) => issue.productionRun.id === selectedRunId,
      ),
    [allIssues, selectedRunId],
  );
  const availableOperations: ActiveOperation[] = useMemo(
    () => [
      ...contextIssues.map((issue) => ({ type: "issue" as const, id: issue.id })),
      ...contextRounds
        .filter((round) => ["PENDING", "IN_PROGRESS"].includes(round.status))
        .map((round) => ({ type: "round" as const, id: round.id })),
    ],
    [contextIssues, contextRounds],
  );

  useEffect(() => {
    const currentKey = operationKey(activeOperation);
    if (!availableOperations.some((item) => operationKey(item) === currentKey)) {
      setActiveOperation(availableOperations[0] ?? null);
    }
  }, [activeOperation, availableOperations]);

  const selectedRound =
    activeOperation?.type === "round"
      ? contextRounds.find((round) => round.id === activeOperation.id) ?? null
      : null;
  const selectedIssue =
    activeOperation?.type === "issue"
      ? contextIssues.find((issue) => issue.id === activeOperation.id) ?? null
      : null;
  const selectedTask =
    allTasks.find((task) => task.id === selectedTaskId) ?? null;
  const queryError = tasks.error ?? rounds.error ?? issues.error;
  const mutationError =
    submit.error ?? recheck.error ?? updateTask.error ?? hold.error;

  const resetMutationFeedback = () => {
    setSuccess("");
    submit.reset();
    recheck.reset();
    updateTask.reset();
    hold.reset();
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["mechanic"] });
  };

  const runOnce = async (
    key: string,
    action: () => Promise<unknown>,
    message: string,
    afterSuccess?: () => void,
  ) => {
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setSuccess("");
    submit.reset();
    recheck.reset();
    updateTask.reset();
    hold.reset();
    try {
      await action();
      await refresh();
      afterSuccess?.();
      setSuccess(message);
    } catch {
      // The owning mutation exposes the API error and all entered values stay mounted.
      throw new Error("operation-failed");
    } finally {
      inFlight.current.delete(key);
    }
  };

  if (tasks.isPending || rounds.isPending || issues.isPending) {
    return <LoadingState label="Mexanik ish maydoni yuklanmoqda..." />;
  }

  if (tasks.isError || rounds.isError || issues.isError) {
    return (
      <ErrorState
        title="Mexanik ma’lumotlari yuklanmadi"
        description={
          queryError instanceof Error
            ? queryError.message
            : "Ma’lumotlarni olishda xatolik yuz berdi."
        }
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void Promise.all([tasks.refetch(), rounds.refetch(), issues.refetch()])}
          >
            Qayta urinish
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mexanik ish maydoni"
        description="Stanokdagi joriy ish, rejalashtirilgan o‘lchov va texnik vazifalar"
      />

      {success ? (
        <p
          role="status"
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200"
        >
          {success}
        </p>
      ) : null}
      {mutationError instanceof Error ? (
        <p
          role="alert"
          className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
        >
          {mutationError.message}
        </p>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Stanok va ishlab chiqarish</h2>
          <p className="text-sm text-muted-foreground">
            O‘lchov kiritish uchun ishlayotgan stanokni tanlang.
          </p>
        </div>
        {runContexts.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {runContexts.map((context) => {
              const selected = context.runId === selectedRunId;
              const pendingCount = allRounds.filter(
                (round) =>
                  round.productionRun.id === context.runId &&
                  ["PENDING", "IN_PROGRESS"].includes(round.status),
              ).length;
              const issueCount = allIssues.filter(
                (issue) => issue.productionRun.id === context.runId,
              ).length;
              return (
                <button
                  key={context.runId}
                  type="button"
                  aria-pressed={selected}
                  className={`min-h-24 rounded-xl border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "bg-card hover:bg-muted/40"
                  }`}
                  onClick={() => {
                    resetMutationFeedback();
                    setSelectedRunId(context.runId);
                    setActiveOperation(null);
                  }}
                >
                  <span className="block font-semibold">{context.machineCode}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {context.productName} · {formatVisibleStatusText(context.status)}
                  </span>
                  <span className="mt-2 block text-xs">
                    {issueCount
                      ? `${issueCount} ta qayta tekshiruv kerak`
                      : `${pendingCount} ta o‘lchov kutilmoqda`}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Faol ishlab chiqarish topilmadi"
            description="Mexanikka biriktirilgan faol run va o‘lchov bo‘lsa, shu yerda ko‘rinadi."
          />
        )}
      </section>

      {selectedRunId ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Bugungi tekshiruvlar</h2>
            <p className="text-sm text-muted-foreground">
              Har bir vaqt alohida tekshiruv. Kerakli yozuvni tanlab, bitta formani to‘ldiring.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {contextIssues.map((issue) => {
              const selected =
                operationKey(activeOperation) === `issue:${issue.id}`;
              return (
                <button
                  key={issue.id}
                  type="button"
                  aria-pressed={selected}
                  className={`min-h-20 rounded-xl border p-3 text-left focus:outline-none focus:ring-2 focus:ring-primary ${
                    selected
                      ? "border-amber-400 bg-amber-500/10"
                      : "border-amber-500/40 bg-amber-500/5"
                  }`}
                  onClick={() => { resetMutationFeedback(); setActiveOperation({ type: "issue", id: issue.id }); }}
                >
                  <StatusBadge tone="danger">Qayta tekshiruv</StatusBadge>
                  <span className="mt-2 block text-sm font-medium">
                    {formatDateTimeForUser(issue.recheckDueAt)}
                  </span>
                </button>
              );
            })}
            {contextRounds.map((round, index) => {
              const actionable = ["PENDING", "IN_PROGRESS"].includes(round.status);
              const selected =
                operationKey(activeOperation) === `round:${round.id}`;
              return (
                <button
                  key={round.id}
                  type="button"
                  disabled={!actionable}
                  aria-pressed={selected}
                  className={`min-h-20 rounded-xl border p-3 text-left focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-default disabled:opacity-70 ${
                    selected ? "border-primary bg-primary/10" : "bg-card"
                  }`}
                  onClick={() => { resetMutationFeedback(); setActiveOperation({ type: "round", id: round.id }); }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{index + 1}-tekshiruv</span>
                    <StatusBadge tone={roundTone[round.status] ?? "neutral"}>
                      {formatVisibleStatusText(round.status)}
                    </StatusBadge>
                  </span>
                  <span className="mt-2 block text-sm text-muted-foreground">
                    {formatDateTimeForUser(round.scheduledAt)}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedRound ? (
            <InspectionForm
              round={selectedRound}
              values={values}
              isPending={submit.isPending}
              onValueChange={(key, value) =>
                setValues((current) => ({ ...current, [key]: value }))
              }
              onSubmit={() =>
                runOnce(
                  `round:${selectedRound.id}`,
                  () =>
                    submit.mutateAsync({
                      id: selectedRound.id,
                      metrics: selectedRound.specification.metrics.map((metric) => ({
                        metricId: metric.id,
                        value: Number(values[`${selectedRound.id}:${metric.id}`]),
                      })),
                    }),
                  "O‘lchov saqlandi.",
                ).catch(() => undefined)
              }
            />
          ) : null}

          {selectedIssue ? (
            <RecheckForm
              issue={selectedIssue}
              values={values}
              isPending={recheck.isPending}
              canHold={canHold}
              onValueChange={(key, value) =>
                setValues((current) => ({ ...current, [key]: value }))
              }
              onSubmit={() =>
                runOnce(
                  `issue:${selectedIssue.id}`,
                  () =>
                    recheck.mutateAsync({
                      id: selectedIssue.id,
                      metrics: selectedIssue.inspectionRound.specification.metrics.map(
                        (metric) => ({
                          metricId: metric.id,
                          value: Number(values[`issue:${selectedIssue.id}:${metric.id}`]),
                        }),
                      ),
                    }),
                  "Qayta o‘lchov saqlandi.",
                ).catch(() => undefined)
              }
              onRequestHold={() => setIssueToHold(selectedIssue)}
            />
          ) : null}

          {!availableOperations.length ? (
            <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
              Bu run uchun hozir bajariladigan o‘lchov yo‘q. Yakunlangan natijalar quyida ko‘rsatilgan.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Texnik vazifalar</h2>
          <p className="text-sm text-muted-foreground">
            Vazifani tanlang. Yakunlashdan oldin bajarilgan natija va tasdiq talab qilinadi.
          </p>
        </div>
        {allTasks.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {allTasks.map((task) => {
              const selected = selectedTaskId === task.id;
              return (
                <article
                  key={task.id}
                  className={`rounded-xl border p-4 ${
                    selected ? "border-primary bg-primary/5" : "bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {task.machine.code} · {formatVisibleStatusText(task.type)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    </div>
                    <StatusBadge tone={task.status === "COMPLETED" ? "success" : "info"}>
                      {formatVisibleStatusText(task.status)}
                    </StatusBadge>
                  </div>
                  {task.status === "COMPLETED" ? (
                    task.resolution ? (
                      <p className="mt-3 text-sm text-emerald-300">
                        Natija: {task.resolution}
                      </p>
                    ) : null
                  ) : (
                    <Button
                      type="button"
                      variant={selected ? "default" : "outline"}
                      className="mt-3 min-h-11 w-full"
                      aria-pressed={selected}
                      onClick={() =>
                        setSelectedTaskId((current) =>
                          current === task.id ? "" : task.id,
                        )
                      }
                    >
                      {selected ? "Vazifa tanlangan" : "Vazifani ochish"}
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Texnik vazifa yo‘q"
            description="Yangi vazifa biriktirilganda shu yerda ko‘rinadi."
          />
        )}

        {selectedTask && selectedTask.status !== "COMPLETED" ? (
          <article className="rounded-xl border border-primary/40 bg-primary/5 p-4">
            <p className="font-semibold">
              {selectedTask.machine.code} · {selectedTask.description}
            </p>
            {selectedTask.status === "OPEN" ? (
              <Button
                type="button"
                className="mt-4 min-h-11 w-full sm:w-auto"
                disabled={updateTask.isPending}
                onClick={() =>
                  void runOnce(
                    `task:${selectedTask.id}`,
                    () =>
                      updateTask.mutateAsync({
                        id: selectedTask.id,
                        status: "IN_PROGRESS",
                      }),
                    "Vazifa boshlandi.",
                  ).catch(() => undefined)
                }
              >
                {updateTask.isPending ? "Boshlanmoqda..." : "Ishni boshlash"}
              </Button>
            ) : (
              <form
                className="mt-4 space-y-3"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  setTaskToComplete(selectedTask);
                }}
              >
                <label className="block text-sm font-medium" htmlFor={`task-resolution-${selectedTask.id}`}>
                  Bajarilgan ish natijasi
                </label>
                <Input
                  id={`task-resolution-${selectedTask.id}`}
                  required
                  disabled={updateTask.isPending}
                  placeholder="Nima bajarilganini qisqa yozing"
                  value={values[`task:${selectedTask.id}`] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [`task:${selectedTask.id}`]: event.target.value,
                    }))
                  }
                />
                <Button className="min-h-11 w-full sm:w-auto" disabled={updateTask.isPending}>
                  Yakunlashni tekshirish
                </Button>
              </form>
            )}
          </article>
        ) : null}
      </section>

      {contextRounds.some((round) => ["PASSED", "ATTENTION"].includes(round.status)) ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Bugungi natijalar</h2>
            <p className="text-sm text-muted-foreground">
              Yakunlangan tekshiruvlar faqat ma’lumot uchun ko‘rsatiladi.
            </p>
          </div>
          <div className="divide-y rounded-xl border bg-card">
            {contextRounds
              .filter((round) => ["PASSED", "ATTENTION"].includes(round.status))
              .map((round) => (
                <div key={round.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium">
                      {round.machine.code} · {round.productionRun.productVariant.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTimeForUser(round.scheduledAt)} · {round.measurements.length} ta o‘lchov
                    </p>
                  </div>
                  <StatusBadge tone={roundTone[round.status] ?? "neutral"}>
                    {formatVisibleStatusText(round.status)}
                  </StatusBadge>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      <ConfirmDialog
        open={Boolean(taskToComplete)}
        onOpenChange={(open) => {
          if (!open) setTaskToComplete(null);
        }}
        title="Vazifani yakunlaysizmi?"
        description={
          taskToComplete
            ? `${taskToComplete.machine.code} uchun vazifa bajarilgan deb belgilanadi. Bu amalni ushbu oynadan ortga qaytarib bo‘lmaydi.`
            : ""
        }
        confirmLabel="Ha, vazifani yakunlash"
        isPending={updateTask.isPending}
        errorMessage={updateTask.error instanceof Error ? updateTask.error.message : null}
        onConfirm={async () => {
          if (!taskToComplete) return;
          await runOnce(
            `task:${taskToComplete.id}`,
            () =>
              updateTask.mutateAsync({
                id: taskToComplete.id,
                status: "COMPLETED",
                resolution: values[`task:${taskToComplete.id}`],
              }),
            "Vazifa yakunlandi.",
            () => {
              setValues((current) => ({
                ...current,
                [`task:${taskToComplete.id}`]: "",
              }));
              setSelectedTaskId("");
              setTaskToComplete(null);
            },
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(issueToHold)}
        onOpenChange={(open) => {
          if (!open) setIssueToHold(null);
        }}
        title="Ishlab chiqarishni vaqtincha to‘xtatasizmi?"
        description={
          issueToHold
            ? `${issueToHold.machine.code} stanogidagi joriy ishlab chiqarish HOLD holatiga o‘tadi. Davom ettirish boshqa boshqaruv amali orqali bajariladi.`
            : ""
        }
        confirmLabel="Ha, vaqtincha to‘xtatish"
        destructive
        isPending={hold.isPending}
        errorMessage={hold.error instanceof Error ? hold.error.message : null}
        onConfirm={async () => {
          if (!issueToHold) return;
          await runOnce(
            `hold:${issueToHold.id}`,
            () => hold.mutateAsync(issueToHold.id),
            "Ishlab chiqarish vaqtincha to‘xtatildi.",
            () => setIssueToHold(null),
          );
        }}
      />
    </div>
  );
}

function InspectionForm({
  round,
  values,
  isPending,
  onValueChange,
  onSubmit,
}: {
  round: InspectionRound;
  values: Record<string, string>;
  isPending: boolean;
  onValueChange: (key: string, value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="rounded-xl border border-primary/40 bg-primary/5 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            {round.machine.code} · {round.productionRun.productVariant.product.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {formatDateTimeForUser(round.scheduledAt)}
          </p>
        </div>
        <StatusBadge tone={roundTone[round.status] ?? "neutral"}>
          {formatVisibleStatusText(round.status)}
        </StatusBadge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {round.specification.metrics.map((metric) => {
          const inputId = `round-${round.id}-${metric.id}`;
          return (
            <label key={metric.id} className="text-sm" htmlFor={inputId}>
              <span className="font-medium">
                {metric.name} ({metric.unit})
              </span>
              <Input
                id={inputId}
                className="mt-1 min-h-11"
                type="number"
                step="0.001"
                required
                disabled={isPending}
                value={values[`${round.id}:${metric.id}`] ?? ""}
                onChange={(event) =>
                  onValueChange(`${round.id}:${metric.id}`, event.target.value)
                }
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Norma {metric.min}–{metric.max}, maqsad {metric.target}
              </span>
            </label>
          );
        })}
      </div>
      <Button className="mt-4 min-h-11 w-full sm:w-auto" disabled={isPending}>
        {isPending ? "Saqlanmoqda..." : "O‘lchovni saqlash"}
      </Button>
    </form>
  );
}

function RecheckForm({
  issue,
  values,
  isPending,
  canHold,
  onValueChange,
  onSubmit,
  onRequestHold,
}: {
  issue: QualityIssue;
  values: Record<string, string>;
  isPending: boolean;
  canHold: boolean;
  onValueChange: (key: string, value: string) => void;
  onSubmit: () => void;
  onRequestHold: () => void;
}) {
  return (
    <form
      className="rounded-xl border border-amber-500/50 bg-amber-500/5 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{issue.machine.code} · qayta tekshiruv</h3>
          <p className="text-sm text-muted-foreground">
            Muddat: {formatDateTimeForUser(issue.recheckDueAt)}
          </p>
        </div>
        <StatusBadge tone="danger">
          {formatVisibleStatusText(issue.status)}
        </StatusBadge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {issue.inspectionRound.specification.metrics.map((metric) => {
          const inputId = `issue-${issue.id}-${metric.id}`;
          return (
            <label key={metric.id} className="text-sm" htmlFor={inputId}>
              <span className="font-medium">
                {metric.name} ({metric.unit})
              </span>
              <Input
                id={inputId}
                className="mt-1 min-h-11"
                type="number"
                step="0.001"
                required
                disabled={isPending}
                value={values[`issue:${issue.id}:${metric.id}`] ?? ""}
                onChange={(event) =>
                  onValueChange(
                    `issue:${issue.id}:${metric.id}`,
                    event.target.value,
                  )
                }
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Norma {metric.min}–{metric.max}, maqsad {metric.target}
              </span>
            </label>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button className="min-h-11" disabled={isPending}>
          {isPending ? "Saqlanmoqda..." : "Qayta o‘lchash"}
        </Button>
        {canHold ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 border-rose-500/40 text-rose-300"
            disabled={isPending}
            onClick={onRequestHold}
          >
            Ishlab chiqarishni vaqtincha to‘xtatish
          </Button>
        ) : null}
      </div>
    </form>
  );
}
