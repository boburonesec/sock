import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import {
  combineLocalDateTime,
  localDateString,
  localTimeString,
} from "@/features/machines/format";
import { useAssignMechanic, useMachineLookupsQuery, useMachinesQuery } from "@/lib/api/machines";
import { routes } from "@/lib/routes";
import { Button, DayStepper, SelectField, TextField } from "@/shared/ui/controls";
import { MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Screen } from "@/shared/ui/screen";
import { formatIsoDay } from "@/shared/utils/format";
import { useUiStore } from "@/stores/ui-store";

export default function AssignMechanicRoute() {
  return (
    <AreaGuard
      area="machines"
      backTo={routes.machines}
      endpoint="machinesAssign"
      title="Mexanik biriktirish"
    >
      <AssignMechanicForm />
    </AreaGuard>
  );
}

function AssignMechanicForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ machineId?: string }>();
  const showFlash = useUiStore((state) => state.showFlash);
  const machinesQuery = useMachinesQuery();
  const lookupsQuery = useMachineLookupsQuery();
  const mutation = useAssignMechanic();

  const [machineId, setMachineId] = useState(params.machineId ?? "");
  const [mechanicId, setMechanicId] = useState("");
  const [workShiftId, setWorkShiftId] = useState("");
  const [startDate, setStartDate] = useState(() => localDateString());
  const [startTime, setStartTime] = useState(() => localTimeString());
  const [showErrors, setShowErrors] = useState(false);

  const machines = machinesQuery.data ?? [];
  const machine = machines.find((item) => item.id === machineId);
  const mechanics = (lookupsQuery.data?.employees ?? []).filter(
    (employee) => employee.workProfile === "MECHANIC",
  );
  const validFrom = combineLocalDateTime(startDate, startTime);

  const errors = {
    machine: !machine ? "Stanok tanlanishi kerak." : null,
    mechanic: !mechanicId ? "Mexanik tanlanishi kerak." : null,
    shift: !workShiftId ? "Smena tanlanishi kerak." : null,
    time: !validFrom ? "Vaqtni SS:DD ko'rinishida kiriting, masalan 08:00." : null,
  };

  async function submit() {
    setShowErrors(true);
    if (Object.values(errors).some(Boolean) || !validFrom) {
      return;
    }

    try {
      const result = await mutation.submit({ machineId, mechanicId, workShiftId, validFrom });
      if (result === undefined) return;

      showFlash("Mexanik muvaffaqiyatli biriktirildi.");
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
          <Button label="Biriktirish" loading={mutation.isPending} onPress={() => void submit()} />
        </>
      }
      subtitle="Qaysi mexanik qaysi stanok va smenaga mas'ul ekanini belgilang."
      title="Mexanik biriktirish"
    >
      <QueryState queries={[machinesQuery, lookupsQuery]}>
        <SelectField
          emptyText="Stanok qo'shilmagan."
          error={showErrors ? errors.machine : null}
          label="Stanok"
          onChange={setMachineId}
          options={machines.map((item) => ({
            value: item.id,
            label: `${item.code} · ${item.name}`,
          }))}
          required
          value={machine ? machineId : ""}
        />

        <SelectField
          emptyText="Faol mexanik yo'q."
          error={showErrors ? errors.mechanic : null}
          label="Mas'ul mexanik"
          onChange={setMechanicId}
          options={mechanics.map((mechanic) => ({ value: mechanic.id, label: mechanic.name }))}
          required
          value={mechanicId}
        />

        <SelectField
          emptyText="Smenalar sozlanmagan."
          error={showErrors ? errors.shift : null}
          label="Ish smenasi"
          onChange={setWorkShiftId}
          options={(lookupsQuery.data?.shifts ?? []).map((shift) => ({
            value: shift.id,
            label: shift.name,
          }))}
          required
          value={workShiftId}
        />

        <DayStepper
          displayValue={formatIsoDay(startDate)}
          label="Biriktirish boshlanadigan sana"
          onChange={setStartDate}
          today={localDateString()}
          value={startDate}
        />

        <TextField
          error={showErrors ? errors.time : null}
          keyboardType="numbers-and-punctuation"
          label="Boshlanish vaqti"
          onChangeText={setStartTime}
          placeholder="08:00"
          required
          value={startTime}
        />
      </QueryState>
    </Screen>
  );
}
