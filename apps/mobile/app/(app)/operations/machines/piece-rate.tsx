import { normalizeDecimalInput, type MachineWorkRole } from "@paypoq/shared";
import { useRouter } from "expo-router";
import { useState } from "react";

import { useCreatePieceRate, useMachineLookupsQuery } from "@/lib/api/machines";
import { routes } from "@/lib/routes";
import { Button, Segmented, SelectField, TextField } from "@/shared/ui/controls";
import { MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Screen } from "@/shared/ui/screen";
import { useUiStore } from "@/stores/ui-store";

export default function PieceRateRoute() {
  return (
    <AreaGuard
      area="machines"
      backTo={routes.machines}
      endpoint="machinesCreatePieceRate"
      title="Ishbay stavka"
    >
      <PieceRateForm />
    </AreaGuard>
  );
}

function PieceRateForm() {
  const router = useRouter();
  const showFlash = useUiStore((state) => state.showFlash);
  const lookupsQuery = useMachineLookupsQuery();
  const mutation = useCreatePieceRate();
  const [productId, setProductId] = useState("");
  const [workRole, setWorkRole] = useState<MachineWorkRole>("MECHANIC");
  const [amountText, setAmountText] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const amount = normalizeDecimalInput(amountText);
  const errors = {
    product: !productId ? "Mahsulot modeli tanlanishi kerak." : null,
    amount: amount === null ? "Stavka 0 yoki undan katta son bo'lishi kerak." : null,
  };

  async function submit() {
    setShowErrors(true);
    if (errors.product || amount === null) {
      return;
    }

    try {
      // The API contract takes the rate as a JSON number (Web sends the same).
      const result = await mutation.submit({
        productId,
        workRole,
        amount: Number(amount),
        effectiveFrom: new Date().toISOString(),
      });
      if (result === undefined) return;

      showFlash("Ishbay stavka saqlandi.");
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
          <Button label="Stavkani saqlash" loading={mutation.isPending} onPress={() => void submit()} />
        </>
      }
      subtitle="Bir dona mahsulot uchun mexanik yoki operatorga to'lanadigan haq."
      title="Model bo'yicha ishbay stavka"
    >
      <QueryState queries={[lookupsQuery]}>
        <SelectField
          emptyText="Mahsulot modeli yo'q."
          error={showErrors ? errors.product : null}
          label="Mahsulot modeli"
          onChange={setProductId}
          options={(lookupsQuery.data?.products ?? []).map((product) => ({
            value: product.id,
            label: product.name,
          }))}
          required
          value={productId}
        />

        <Segmented
          label="Ish turi"
          onChange={setWorkRole}
          options={[
            { value: "MECHANIC", label: "Mexanik" },
            { value: "MACHINE_OPERATOR", label: "Operator" },
          ]}
          value={workRole}
        />

        <TextField
          error={showErrors ? errors.amount : null}
          hint="Stavka shu paytdan boshlab amal qiladi."
          keyboardType="decimal-pad"
          label="Bir dona uchun haq (so'm)"
          onChangeText={setAmountText}
          placeholder="so'm/dona"
          required
          value={amountText}
        />
      </QueryState>
    </Screen>
  );
}
