import { MAINTENANCE_TASK_PRIORITIES, MAINTENANCE_TASK_TYPES } from "@paypoq/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import { statusLabel } from "@/features/machines/format";
import {
  useCreateMaintenanceTask,
  useMachineLookupsQuery,
  useMachinesQuery,
} from "@/lib/api/machines";
import { routes } from "@/lib/routes";
import { Button, SelectField, TextField } from "@/shared/ui/controls";
import { MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Screen } from "@/shared/ui/screen";
import { useUiStore } from "@/stores/ui-store";

export default function MaintenanceTaskRoute() {
  return (
    <AreaGuard
      area="machines"
      backTo={routes.machines}
      endpoint="machinesCreateTask"
      title="Mexanikka vazifa"
    >
      <MaintenanceTaskForm />
    </AreaGuard>
  );
}

function MaintenanceTaskForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ machineId?: string }>();
  const showFlash = useUiStore((state) => state.showFlash);
  const machinesQuery = useMachinesQuery();
  const lookupsQuery = useMachineLookupsQuery();
  const mutation = useCreateMaintenanceTask();

  const [machineId, setMachineId] = useState(params.machineId ?? "");
  const [assigneeMechanicId, setAssigneeMechanicId] = useState("");
  const [type, setType] = useState<string>("REPAIR");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [description, setDescription] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const machines = machinesQuery.data ?? [];
  const machine = machines.find((item) => item.id === machineId);
  const mechanics = (lookupsQuery.data?.employees ?? []).filter(
    (employee) => employee.workProfile === "MECHANIC",
  );

  const errors = {
    machine: !machine ? "Stanok tanlanishi kerak." : null,
    mechanic: !assigneeMechanicId ? "Mexanik tanlanishi kerak." : null,
    description: !description.trim() ? "Vazifa tavsifi kiritilishi kerak." : null,
  };

  async function submit() {
    setShowErrors(true);
    if (Object.values(errors).some(Boolean)) {
      return;
    }

    try {
      const result = await mutation.submit({
        machineId,
        assigneeMechanicId,
        type,
        priority,
        description: description.trim(),
      });
      if (!result) return;

      showFlash("Mexanikka vazifa yuborildi.");
      router.back();
    } catch {
      // The API message is rendered from mutation.error; the form keeps its values.
    }
  }

  return (
    <Screen
      backTo={routes.machines}
      eyebrow="Stanok ishi"
      footer={
        <>
          <MutationError error={mutation.error} />
          <Button label="Vazifani yuborish" loading={mutation.isPending} onPress={() => void submit()} />
        </>
      }
      subtitle="Stanokni tanlang, mas'ul mexanikni belgilang va vazifani yozing."
      title="Mexanikka vazifa"
    >
      <QueryState queries={[machinesQuery, lookupsQuery]}>
        <SelectField
          emptyText="Stanok qo'shilmagan."
          error={showErrors ? errors.machine : null}
          label="Stanok"
          onChange={setMachineId}
          options={machines.map((item) => ({ value: item.id, label: item.code, description: item.name }))}
          required
          value={machine ? machineId : ""}
        />

        <SelectField
          emptyText="Faol mexanik yo'q."
          error={showErrors ? errors.mechanic : null}
          label="Mas'ul mexanik"
          onChange={setAssigneeMechanicId}
          options={mechanics.map((mechanic) => ({ value: mechanic.id, label: mechanic.name }))}
          required
          value={assigneeMechanicId}
        />

        <SelectField
          label="Vazifa turi"
          onChange={setType}
          options={MAINTENANCE_TASK_TYPES.map((value) => ({ value, label: statusLabel(value) }))}
          value={type}
        />

        <SelectField
          label="Vazifa muhimligi"
          onChange={setPriority}
          options={MAINTENANCE_TASK_PRIORITIES.map((value) => ({ value, label: statusLabel(value) }))}
          value={priority}
        />

        <TextField
          error={showErrors ? errors.description : null}
          label="Vazifa tavsifi"
          multiline
          onChangeText={setDescription}
          placeholder="Nima qilinishi kerak?"
          required
          value={description}
        />
      </QueryState>
    </Screen>
  );
}
