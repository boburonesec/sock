import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import { useMachineLookupsQuery, useMachinesQuery } from "@/lib/api/machines";
import { useCreateProductionRun, useLookupVariantsQuery } from "@/lib/api/production";
import { routes } from "@/lib/routes";
import { Button, SelectField } from "@/shared/ui/controls";
import { Banner, MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Screen } from "@/shared/ui/screen";
import { useUiStore } from "@/stores/ui-store";

export default function StartRunRoute() {
  return (
    <AreaGuard
      area="machines"
      backTo={routes.machines}
      endpoint="productionCreateRun"
      title="Stanok ishini boshlash"
    >
      <StartRunForm />
    </AreaGuard>
  );
}

function StartRunForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ machineId?: string }>();
  const showFlash = useUiStore((state) => state.showFlash);
  const machinesQuery = useMachinesQuery();
  const lookupsQuery = useMachineLookupsQuery();
  const variantsQuery = useLookupVariantsQuery();
  const mutation = useCreateProductionRun();

  const [machineId, setMachineId] = useState(params.machineId ?? "");
  const [productVariantId, setProductVariantId] = useState("");
  const [operatorEmployeeId, setOperatorEmployeeId] = useState("");
  const [workShiftId, setWorkShiftId] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const machines = machinesQuery.data ?? [];
  const machine = machines.find((item) => item.id === machineId);
  const operators = (lookupsQuery.data?.employees ?? []).filter(
    (employee) => employee.workProfile === "MACHINE_OPERATOR",
  );
  const shifts = lookupsQuery.data?.shifts ?? [];
  // The API takes the mechanic from the machine's assignment for the chosen shift.
  const assignedMechanic = machine?.assignments.find(
    (assignment) => assignment.workShift.id === workShiftId,
  );

  const errors = {
    machine: !machine ? "Stanok tanlanishi kerak." : null,
    variant: !productVariantId ? "Mahsulot turi tanlanishi kerak." : null,
    operator: !operatorEmployeeId ? "Operator tanlanishi kerak." : null,
    shift: !workShiftId ? "Smena tanlanishi kerak." : null,
  };

  async function submit() {
    setShowErrors(true);
    if (Object.values(errors).some(Boolean)) {
      return;
    }

    try {
      const result = await mutation.submit({
        machineId,
        productVariantId,
        operatorEmployeeId,
        workShiftId,
      });
      if (!result) return;

      showFlash("Stanokda ishlab chiqarish boshlandi.");
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
          <Button
            label="Stanok ishini boshlash"
            loading={mutation.isPending}
            onPress={() => void submit()}
          />
        </>
      }
      subtitle="Stanok, mahsulot, operator va smenani tanlang."
      title="Stanok ishini boshlash"
    >
      <QueryState queries={[machinesQuery, lookupsQuery, variantsQuery]}>
        <SelectField
          emptyText="Stanok qo'shilmagan."
          error={showErrors ? errors.machine : null}
          label="Stanok"
          onChange={setMachineId}
          options={machines.map((item) => ({
            value: item.id,
            label: item.code,
            description: item.name,
          }))}
          required
          value={machine ? machineId : ""}
        />

        <SelectField
          emptyText="Faol mahsulot turi yo'q."
          error={showErrors ? errors.variant : null}
          label="Mahsulot turi"
          onChange={setProductVariantId}
          options={(variantsQuery.data ?? []).map((variant) => ({
            value: variant.id,
            label: variant.label,
          }))}
          placeholder="Mahsulot turini tanlang"
          required
          value={productVariantId}
        />

        <SelectField
          emptyText="Faol stanok operatori yo'q."
          error={showErrors ? errors.operator : null}
          label="Stanok operatori"
          onChange={setOperatorEmployeeId}
          options={operators.map((operator) => ({ value: operator.id, label: operator.name }))}
          required
          value={operatorEmployeeId}
        />

        <SelectField
          emptyText="Smenalar sozlanmagan."
          error={showErrors ? errors.shift : null}
          label="Ish smenasi"
          onChange={setWorkShiftId}
          options={shifts.map((shift) => ({ value: shift.id, label: shift.name }))}
          required
          value={workShiftId}
        />

        {machine && workShiftId ? (
          assignedMechanic ? (
            <Banner message={`Mas'ul mexanik: ${assignedMechanic.mechanic.name}`} tone="info" />
          ) : (
            <Banner
              message="Bu stanok va smenaga mexanik biriktirilmagan. Ishni boshlash uchun avval mexanik biriktiring."
              tone="warning"
            />
          )
        ) : null}
      </QueryState>
    </Screen>
  );
}
