import { ACTIVE_PRODUCTION_RUN_STATUSES } from "@paypoq/shared";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { machineStatusTone, runStatusTone, statusLabel } from "@/features/machines/format";
import { useAccess } from "@/lib/access/use-access";
import { useMachinesQuery } from "@/lib/api/machines";
import { useProductionRunsQuery } from "@/lib/api/production";
import { routes } from "@/lib/routes";
import { Badge } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { ActionTile, ListRow, SearchInput, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";

export default function MachinesRoute() {
  return (
    <AreaGuard area="machines" backTo={routes.operations} title="Stanok ishi">
      <Machines />
    </AreaGuard>
  );
}

function Machines() {
  const router = useRouter();
  const access = useAccess();
  const canViewRuns = access.can("productionRuns");
  const canManageRuns = access.can("productionCreateRunIntake");
  const machinesQuery = useMachinesQuery();
  const runsQuery = useProductionRunsQuery(canViewRuns);
  const [search, setSearch] = useState("");

  const activeRuns = (runsQuery.data ?? []).filter((run) =>
    ACTIVE_PRODUCTION_RUN_STATUSES.includes(run.status),
  );
  const term = search.trim().toLowerCase();
  const machines = useMemo(
    () =>
      (machinesQuery.data ?? []).filter((machine) =>
        term ? `${machine.code} ${machine.name}`.toLowerCase().includes(term) : true,
      ),
    [machinesQuery.data, term],
  );

  const workflows: {
    visible: boolean;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    href: string;
    primary?: boolean;
  }[] = [
    {
      visible: access.can("productionCreateRun"),
      title: "Stanok ishini boshlash",
      subtitle: "Stanok, mahsulot, operator va smenani tanlang",
      icon: "play-outline",
      href: routes.machinesStartRun,
      primary: true,
    },
    {
      visible: access.can("machinesCreate"),
      title: "Yangi stanok qo'shish",
      subtitle: "Zavoddagi kod va nom",
      icon: "add-circle-outline",
      href: routes.machinesNew,
    },
    {
      visible: access.can("machinesAssign"),
      title: "Mexanik biriktirish",
      subtitle: "Stanok va smenaga mas'ul mexanik",
      icon: "person-add-outline",
      href: routes.machinesAssign,
    },
    {
      visible: access.can("machinesCreatePieceRate"),
      title: "Ishbay stavka belgilash",
      subtitle: "Bir dona uchun mexanik yoki operator haqi",
      icon: "cash-outline",
      href: routes.machinesPieceRate,
    },
    {
      visible: access.can("machinesCreateTask"),
      title: "Mexanikka vazifa berish",
      subtitle: "Ta'mirlash, sozlash yoki tekshiruv",
      icon: "build-outline",
      href: routes.machinesTask,
    },
    {
      visible: access.can("machinesConfigureInspectionSlots"),
      title: "Tekshiruv vaqtlarini sozlash",
      subtitle: "Smenadagi uchta tekshiruv vaqti",
      icon: "timer-outline",
      href: routes.machinesInspectionSlots,
    },
    {
      visible: access.can("machinesCreateSpecification"),
      title: "O'lchov me'yorlarini sozlash",
      subtitle: "Sifat tekshiruvi chegaralari",
      icon: "speedometer-outline",
      href: routes.machinesMeasurementSpec,
    },
  ];
  const visibleWorkflows = workflows.filter((workflow) => workflow.visible);

  return (
    <Screen
      backTo={routes.operations}
      eyebrow="Amallar"
      onRefresh={() => {
        void machinesQuery.refetch();
        if (canViewRuns) void runsQuery.refetch();
      }}
      refreshing={machinesQuery.isRefetching || runsQuery.isRefetching}
      subtitle="Stanok ishini boshlash va stanokdan chiqqan mahsulotni qabul qilish."
      title="Stanok ishi"
    >
      {visibleWorkflows.length ? (
        <Section title="Qaysi ishni bajarmoqchisiz?">
          {visibleWorkflows.map((workflow) => (
            <ActionTile
              icon={workflow.icon}
              key={workflow.href}
              onPress={() => router.push(workflow.href)}
              primary={workflow.primary}
              subtitle={workflow.subtitle}
              title={workflow.title}
            />
          ))}
        </Section>
      ) : null}

      {canViewRuns ? (
        <Section
          title={canManageRuns ? "Stanokdan chiqqan mahsulotni qabul qilish" : "Faol stanok ishlari"}
        >
          <QueryState queries={[runsQuery]} skeletonRows={2}>
            {activeRuns.length === 0 ? (
              <EmptyState
                description="Stanok ishga tushirilgach, u shu yerda ko'rinadi."
                title="Faol stanok ishi yo'q"
              />
            ) : null}
            {activeRuns.map((run) => (
              <ListRow
                badge={<Badge label={statusLabel(run.status)} tone={runStatusTone[run.status] ?? "info"} />}
                key={run.id}
                meta={`Operator: ${run.operator.name} · Mexanik: ${run.mechanic.name}`}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/operations/machines/run/[runId]",
                    params: { runId: run.id },
                  })
                }
                subtitle={`${run.productVariant.product.name} · ${run.productVariant.color.name}`}
                title={run.machine.code}
              />
            ))}
          </QueryState>
        </Section>
      ) : null}

      <Section title="Stanoklar">
        <QueryState queries={[machinesQuery]}>
          <SearchInput onChangeText={setSearch} placeholder="Stanok kodi yoki nomi" value={search} />
          {machines.length === 0 ? (
            <EmptyState
              description={
                term ? "Qidiruvga mos stanok topilmadi." : "Stanok qo'shilgach shu yerda ko'rinadi."
              }
              title="Stanok yo'q"
            />
          ) : null}
          {machines.map((machine) => (
            <ListRow
              badge={
                <Badge
                  label={statusLabel(machine.status)}
                  tone={machineStatusTone[machine.status] ?? "info"}
                />
              }
              key={machine.id}
              meta={
                machine.assignments.length
                  ? machine.assignments
                      .map((assignment) => `${assignment.mechanic.name} (${assignment.workShift.name})`)
                      .join(", ")
                  : "Mexanik biriktirilmagan"
              }
              onPress={() =>
                router.push({
                  pathname: "/(app)/operations/machines/[machineId]",
                  params: { machineId: machine.id },
                })
              }
              subtitle={machine.name}
              title={machine.code}
            />
          ))}
        </QueryState>
      </Section>
    </Screen>
  );
}
