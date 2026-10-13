import { ACTIVE_PRODUCTION_RUN_STATUSES } from "@paypoq/shared";
import { useLocalSearchParams, useRouter } from "expo-router";

import { machineStatusTone, runStatusTone, statusLabel } from "@/features/machines/format";
import { useAccess } from "@/lib/access/use-access";
import { useMachinesQuery } from "@/lib/api/machines";
import { useProductionRunsQuery } from "@/lib/api/production";
import { routes } from "@/lib/routes";
import { Badge } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { ActionTile, Card, KeyValueList, ListRow, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";

export default function MachineDetailRoute() {
  return (
    <AreaGuard area="machines" backTo={routes.machines} title="Stanok">
      <MachineDetail />
    </AreaGuard>
  );
}

function MachineDetail() {
  const router = useRouter();
  const access = useAccess();
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const canViewRuns = access.can("productionRuns");
  const machinesQuery = useMachinesQuery();
  const runsQuery = useProductionRunsQuery(canViewRuns);
  const machine = (machinesQuery.data ?? []).find((item) => item.id === machineId);
  const activeRun = (runsQuery.data ?? []).find(
    (run) => run.machine.id === machineId && ACTIVE_PRODUCTION_RUN_STATUSES.includes(run.status),
  );

  return (
    <Screen
      backTo={routes.machines}
      eyebrow="Stanok"
      onRefresh={() => {
        void machinesQuery.refetch();
        if (canViewRuns) void runsQuery.refetch();
      }}
      refreshing={machinesQuery.isRefetching || runsQuery.isRefetching}
      subtitle={machine?.name}
      title={machine?.code ?? "Stanok"}
    >
      <QueryState queries={canViewRuns ? [machinesQuery, runsQuery] : [machinesQuery]}>
        {!machine ? (
          <EmptyState description="Stanok topilmadi yoki o'chirilgan." title="Stanok topilmadi" />
        ) : (
          <>
            <Card tone="accent">
              <Badge
                label={statusLabel(machine.status)}
                tone={machineStatusTone[machine.status] ?? "info"}
              />
              <KeyValueList
                items={[
                  { label: "Kod", value: machine.code },
                  { label: "Nomi", value: machine.name },
                  { label: "Izoh", value: machine.note ?? "—" },
                ]}
              />
            </Card>

            <Section title="Biriktirilgan mexaniklar">
              {machine.assignments.length === 0 ? (
                <EmptyState
                  description="Stanok ishini boshlash uchun smenaga mexanik biriktirilgan bo'lishi kerak."
                  title="Mexanik biriktirilmagan"
                />
              ) : null}
              {machine.assignments.map((assignment) => (
                <ListRow
                  key={assignment.id}
                  subtitle={`Smena: ${assignment.workShift.name}`}
                  title={assignment.mechanic.name}
                />
              ))}
            </Section>

            {canViewRuns ? (
              <Section title="Joriy ish">
                {activeRun ? (
                  <ListRow
                    badge={
                      <Badge
                        label={statusLabel(activeRun.status)}
                        tone={runStatusTone[activeRun.status] ?? "info"}
                      />
                    }
                    meta={`Operator: ${activeRun.operator.name} · Mexanik: ${activeRun.mechanic.name}`}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/operations/machines/run/[runId]",
                        params: { runId: activeRun.id },
                      })
                    }
                    subtitle={`Smena: ${activeRun.workShift.name}`}
                    title={`${activeRun.productVariant.product.name} · ${activeRun.productVariant.color.name}`}
                  />
                ) : (
                  <EmptyState description="Bu stanokda hozir faol ish yo'q." title="Faol ish yo'q" />
                )}
              </Section>
            ) : null}

            <Section title="Amallar">
              {access.can("productionCreateRun") && !activeRun ? (
                <ActionTile
                  icon="play-outline"
                  onPress={() =>
                    router.push({ pathname: routes.machinesStartRun, params: { machineId: machine.id } })
                  }
                  primary
                  title="Stanok ishini boshlash"
                />
              ) : null}
              {access.can("machinesAssign") ? (
                <ActionTile
                  icon="person-add-outline"
                  onPress={() =>
                    router.push({ pathname: routes.machinesAssign, params: { machineId: machine.id } })
                  }
                  title="Mexanik biriktirish"
                />
              ) : null}
              {access.can("machinesCreateTask") ? (
                <ActionTile
                  icon="build-outline"
                  onPress={() =>
                    router.push({ pathname: routes.machinesTask, params: { machineId: machine.id } })
                  }
                  title="Mexanikka vazifa berish"
                />
              ) : null}
            </Section>
          </>
        )}
      </QueryState>
    </Screen>
  );
}
