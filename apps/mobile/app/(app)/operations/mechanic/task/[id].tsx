import { useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { statusLabel, taskStatusTone } from "@/features/machines/format";
import { useAccess } from "@/lib/access/use-access";
import { useMaintenanceTasksQuery, useUpdateMaintenanceTask } from "@/lib/api/machines";
import { routes } from "@/lib/routes";
import { Button, TextField } from "@/shared/ui/controls";
import { Badge, Banner, ConfirmSheet, MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Card, KeyValueList } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatDateTime } from "@/shared/utils/format";

export default function MaintenanceTaskDetailRoute() {
  return (
    <AreaGuard area="mechanic" backTo={routes.mechanic} endpoint="machinesTasks" title="Texnik vazifa">
      <MaintenanceTaskDetail />
    </AreaGuard>
  );
}

function MaintenanceTaskDetail() {
  const access = useAccess();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tasksQuery = useMaintenanceTasksQuery();
  const update = useUpdateMaintenanceTask();
  const [resolution, setResolution] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const task = (tasksQuery.data ?? []).find((item) => item.id === id);
  const canUpdate = access.can("machinesUpdateTask");
  const resolutionError = !resolution.trim() ? "Bajarilgan ish natijasini yozing." : null;

  async function start() {
    if (!task) return;
    setMessage(null);

    try {
      const result = await update.submit({ taskId: task.id, status: "IN_PROGRESS" });
      if (result) setMessage("Vazifa boshlandi.");
    } catch {
      // The API message is rendered from update.error.
    }
  }

  async function complete() {
    if (!task) return;

    try {
      const result = await update.submit({
        taskId: task.id,
        status: "COMPLETED",
        resolution: resolution.trim(),
      });
      if (!result) return;

      setConfirmComplete(false);
      setResolution("");
      setShowErrors(false);
      setMessage("Vazifa yakunlandi.");
    } catch {
      // The confirmation sheet stays open and shows the API error.
    }
  }

  return (
    <Screen
      backTo={routes.mechanic}
      eyebrow="Texnik vazifa"
      onRefresh={() => void tasksQuery.refetch()}
      refreshing={tasksQuery.isRefetching}
      subtitle={task?.description}
      title={task ? `${task.machine.code} · ${statusLabel(task.type)}` : "Texnik vazifa"}
    >
      <QueryState queries={[tasksQuery]}>
        {!task ? (
          <EmptyState
            description="Vazifa topilmadi yoki sizga biriktirilmagan."
            title="Vazifa topilmadi"
          />
        ) : (
          <>
            {message ? <Banner message={message} tone="success" /> : null}

            <Card tone="accent">
              <Badge label={statusLabel(task.status)} tone={taskStatusTone[task.status] ?? "info"} />
              <KeyValueList
                items={[
                  { label: "Stanok", value: `${task.machine.code} · ${task.machine.name}` },
                  { label: "Turi", value: statusLabel(task.type) },
                  { label: "Muhimligi", value: statusLabel(task.priority) },
                  { label: "Mas'ul", value: task.assignee.name },
                  { label: "Muddat", value: task.dueAt ? formatDateTime(task.dueAt) : "—" },
                  { label: "Tavsif", value: task.description },
                  ...(task.resolution ? [{ label: "Natija", value: task.resolution }] : []),
                ]}
              />
            </Card>

            {canUpdate && task.status === "OPEN" ? (
              <>
                <MutationError error={update.error} />
                <Button label="Ishni boshlash" loading={update.isPending} onPress={() => void start()} />
              </>
            ) : null}

            {canUpdate && task.status === "IN_PROGRESS" ? (
              <>
                <TextField
                  error={showErrors ? resolutionError : null}
                  label="Bajarilgan ish natijasi"
                  multiline
                  onChangeText={setResolution}
                  placeholder="Nima bajarilganini qisqa yozing"
                  required
                  value={resolution}
                />
                <Button
                  label="Yakunlashni tekshirish"
                  onPress={() => {
                    setShowErrors(true);
                    update.reset();
                    if (!resolutionError) setConfirmComplete(true);
                  }}
                />
              </>
            ) : null}
          </>
        )}
      </QueryState>

      <ConfirmSheet
        confirmLabel="Ha, vazifani yakunlash"
        description={
          task
            ? `${task.machine.code} uchun vazifa bajarilgan deb belgilanadi. Bu amalni ortga qaytarib bo'lmaydi.`
            : ""
        }
        error={update.error}
        onCancel={() => {
          setConfirmComplete(false);
          update.reset();
        }}
        onConfirm={() => void complete()}
        pending={update.isPending}
        title="Vazifani yakunlaysizmi?"
        visible={confirmComplete}
      />
    </Screen>
  );
}
