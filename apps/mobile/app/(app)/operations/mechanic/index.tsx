import { ACTIONABLE_INSPECTION_ROUND_STATUSES, type InspectionRound } from "@paypoq/shared";
import { useRouter } from "expo-router";
import { useMemo } from "react";

import {
  roundStatusTone,
  runStatusTone,
  statusLabel,
  taskStatusTone,
} from "@/features/machines/format";
import {
  useInspectionRoundsQuery,
  useMaintenanceTasksQuery,
  useQualityIssuesQuery,
} from "@/lib/api/machines";
import { routes } from "@/lib/routes";
import { Badge } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Card, KeyValueList, ListRow, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatDateTime } from "@/shared/utils/format";

export default function MechanicWorkspaceRoute() {
  return (
    <AreaGuard area="mechanic" backTo={routes.operations} title="Mexanik ish maydoni">
      <MechanicWorkspace />
    </AreaGuard>
  );
}

function MechanicWorkspace() {
  const router = useRouter();
  const tasksQuery = useMaintenanceTasksQuery();
  const roundsQuery = useInspectionRoundsQuery();
  const issuesQuery = useQualityIssuesQuery();
  const rounds = useMemo(() => roundsQuery.data ?? [], [roundsQuery.data]);
  const issues = issuesQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];

  // One block per production run the mechanic has rounds for today.
  const runs = useMemo(() => {
    const byRun = new Map<string, InspectionRound[]>();
    for (const round of rounds) {
      byRun.set(round.productionRun.id, [...(byRun.get(round.productionRun.id) ?? []), round]);
    }
    return Array.from(byRun.entries());
  }, [rounds]);
  // Issues whose run has no round today still need a recheck.
  const orphanIssues = issues.filter(
    (issue) => !runs.some(([runId]) => runId === issue.productionRun.id),
  );

  const issueRow = (issue: (typeof issues)[number]) => (
    <ListRow
      badge={<Badge label="Qayta tekshiruv" tone="error" />}
      key={issue.id}
      meta={`Muddat: ${formatDateTime(issue.recheckDueAt)}`}
      onPress={() =>
        router.push({
          pathname: "/(app)/operations/mechanic/issue/[id]",
          params: { id: issue.id },
        })
      }
      subtitle={statusLabel(issue.status)}
      title={`${issue.machine.code} · qayta tekshiruv`}
    />
  );

  return (
    <Screen
      backTo={routes.operations}
      eyebrow="Amallar"
      onRefresh={() => {
        void tasksQuery.refetch();
        void roundsQuery.refetch();
        void issuesQuery.refetch();
      }}
      refreshing={tasksQuery.isRefetching || roundsQuery.isRefetching || issuesQuery.isRefetching}
      subtitle="Stanokdagi joriy ish, rejalashtirilgan o'lchov va texnik vazifalar."
      title="Mexanik ish maydoni"
    >
      <QueryState queries={[tasksQuery, roundsQuery, issuesQuery]}>
        <Section
          description="O'lchov kiritish uchun tekshiruvni tanlang."
          title="Stanok va ishlab chiqarish"
        >
          {runs.length === 0 && orphanIssues.length === 0 ? (
            <EmptyState
              description="Mexanikka biriktirilgan faol ish va o'lchov bo'lsa, shu yerda ko'rinadi."
              title="Faol ishlab chiqarish topilmadi"
            />
          ) : null}

          {orphanIssues.map(issueRow)}

          {runs.map(([runId, runRounds]) => {
            const first = runRounds[0];
            if (!first) return null;
            const runIssues = issues.filter((issue) => issue.productionRun.id === runId);
            const pendingCount = runRounds.filter((round) =>
              ACTIONABLE_INSPECTION_ROUND_STATUSES.includes(round.status),
            ).length;

            return (
              <Card key={runId}>
                <Badge
                  label={statusLabel(first.productionRun.status)}
                  tone={runStatusTone[first.productionRun.status] ?? "info"}
                />
                <KeyValueList
                  items={[
                    { label: "Stanok", value: first.machine.code },
                    { label: "Mahsulot", value: first.productionRun.productVariant.product.name },
                    {
                      label: "Holat",
                      value: runIssues.length
                        ? `${runIssues.length} ta qayta tekshiruv kerak`
                        : `${pendingCount} ta o'lchov kutilmoqda`,
                    },
                  ]}
                />

                {runIssues.map(issueRow)}

                {runRounds.map((round, index) => {
                  const actionable = ACTIONABLE_INSPECTION_ROUND_STATUSES.includes(round.status);

                  return (
                    <ListRow
                      badge={
                        <Badge
                          label={statusLabel(round.status)}
                          tone={roundStatusTone[round.status] ?? "info"}
                        />
                      }
                      key={round.id}
                      meta={
                        actionable
                          ? null
                          : `${round.measurements.length} ta o'lchov kiritilgan`
                      }
                      onPress={
                        actionable
                          ? () =>
                              router.push({
                                pathname: "/(app)/operations/mechanic/round/[id]",
                                params: { id: round.id },
                              })
                          : undefined
                      }
                      subtitle={formatDateTime(round.scheduledAt)}
                      title={`${index + 1}-tekshiruv`}
                    />
                  );
                })}
              </Card>
            );
          })}
        </Section>

        <Section
          description="Yakunlashdan oldin bajarilgan natija va tasdiq talab qilinadi."
          title="Texnik vazifalar"
        >
          {tasks.length === 0 ? (
            <EmptyState
              description="Yangi vazifa biriktirilganda shu yerda ko'rinadi."
              title="Texnik vazifa yo'q"
            />
          ) : null}
          {tasks.map((task) => (
            <ListRow
              badge={
                <Badge label={statusLabel(task.status)} tone={taskStatusTone[task.status] ?? "info"} />
              }
              key={task.id}
              meta={`Muhimligi: ${statusLabel(task.priority)}${task.dueAt ? ` · Muddat: ${formatDateTime(task.dueAt)}` : ""}`}
              onPress={() =>
                router.push({
                  pathname: "/(app)/operations/mechanic/task/[id]",
                  params: { id: task.id },
                })
              }
              subtitle={task.description}
              title={`${task.machine.code} · ${statusLabel(task.type)}`}
            />
          ))}
        </Section>
      </QueryState>
    </Screen>
  );
}
