import { parsePositiveInteger } from "@paypoq/shared";
import { useRouter } from "expo-router";
import { useState } from "react";

import {
  useCreateWorkerActivity,
  useLookupEmployeesQuery,
  useLookupVariantsQuery,
  useOperationsSummaryQuery,
  useStageInventoryQuery,
} from "@/lib/api/production";
import { routes } from "@/lib/routes";
import { Button, SelectField, TextField } from "@/shared/ui/controls";
import { Banner, MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Screen } from "@/shared/ui/screen";
import { formatQuantity } from "@/shared/utils/format";
import { useUiStore } from "@/stores/ui-store";

export default function WorkerActivityRoute() {
  return (
    <AreaGuard
      area="production"
      backTo={routes.production}
      endpoint="productionCreateWorkerActivity"
      title="Qo'shimcha bajarilgan ish"
    >
      <WorkerActivityForm />
    </AreaGuard>
  );
}

function WorkerActivityForm() {
  const router = useRouter();
  const showFlash = useUiStore((state) => state.showFlash);
  const summaryQuery = useOperationsSummaryQuery();
  const inventoryQuery = useStageInventoryQuery();
  const variantsQuery = useLookupVariantsQuery();
  const employeesQuery = useLookupEmployeesQuery();
  const mutation = useCreateWorkerActivity();

  const [stageId, setStageId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [productVariantId, setProductVariantId] = useState("");
  const [quantityText, setQuantityText] = useState("");
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const stageOptions = [...(summaryQuery.data?.stageTotals ?? [])]
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((stage) => ({ value: stage.stageId, label: stage.stageName }));
  const stageEmployees = (employeesQuery.data ?? []).filter((employee) =>
    employee.stages.some((stage) => stage.id === stageId),
  );
  const variantOptions = (variantsQuery.data ?? []).map((variant) => ({
    value: variant.id,
    label: variant.label,
  }));
  const hasInventorySelection = Boolean(stageId && productVariantId);
  const availableQuantity =
    (inventoryQuery.data ?? []).find(
      (item) => item.stage.id === stageId && item.productVariant.id === productVariantId,
    )?.quantity ?? 0;
  const quantity = parsePositiveInteger(quantityText);

  const errors = {
    stage: !stageId ? "Bosqich tanlanishi kerak." : null,
    employee: !employeeId ? "Ishchi tanlanishi kerak." : null,
    variant: !productVariantId ? "Mahsulot varianti tanlanishi kerak." : null,
    quantity: quantity === null ? "Miqdor 0 dan katta butun son bo'lishi kerak." : null,
  };

  async function submit() {
    setShowErrors(true);
    if (Object.values(errors).some(Boolean) || quantity === null) {
      return;
    }

    try {
      const result = await mutation.submit({
        employeeId,
        stageId,
        productVariantId,
        quantity,
        note: note.trim() || undefined,
      });
      if (!result) return;

      showFlash("Ishchi faolligi qayd qilindi.");
      router.back();
    } catch {
      // The API message is rendered from mutation.error; the form keeps its values.
    }
  }

  return (
    <Screen
      backTo={routes.production}
      eyebrow="Ishlab chiqarish"
      footer={
        <>
          <MutationError error={mutation.error} />
          <Button
            label="Bajarilgan ishni qo'shish"
            loading={mutation.isPending}
            onPress={() => void submit()}
          />
        </>
      }
      subtitle="Faqat alohida bajarilgan ishni kiritish uchun."
      title="Qo'shimcha bajarilgan ish"
    >
      <QueryState queries={[summaryQuery, inventoryQuery, variantsQuery, employeesQuery]}>
        <Banner
          message="«Keyingi bosqichga o'tkazish» allaqachon ishchi faolligini yozadi (ish haqi uchun). Bu forma faqat qo'shimcha kiritish uchun — bir xil ishni ikki marta yozmang."
          tone="info"
        />

        <SelectField
          error={showErrors ? errors.stage : null}
          label="Bosqich"
          onChange={(value) => {
            setStageId(value);
            setEmployeeId("");
          }}
          options={stageOptions}
          required
          value={stageId}
        />

        <SelectField
          disabled={!stageId || stageEmployees.length === 0}
          error={showErrors ? errors.employee : null}
          label="Ishchi"
          onChange={setEmployeeId}
          options={stageEmployees.map((employee) => ({
            value: employee.id,
            label: employee.name,
            description: employee.workShift?.name,
          }))}
          placeholder={stageId ? "Tanlang" : "Avval bosqichni tanlang"}
          required
          value={employeeId}
        />

        {stageId && stageEmployees.length === 0 ? (
          <Banner
            message="Bu bosqichga biriktirilgan faol ishchi yo'q. Avval Xodimlar bo'limida bosqich biriktiring."
            tone="warning"
          />
        ) : null}

        <SelectField
          error={showErrors ? errors.variant : null}
          label="Mahsulot varianti"
          onChange={setProductVariantId}
          options={variantOptions}
          required
          value={productVariantId}
        />

        {hasInventorySelection ? (
          <Banner
            message={`Tanlangan mahsulotdan bu bosqichda ${formatQuantity(availableQuantity, "dona")} mavjud.`}
            tone={availableQuantity > 0 ? "success" : "warning"}
          />
        ) : null}

        <TextField
          error={showErrors ? errors.quantity : null}
          keyboardType="number-pad"
          label="Miqdor"
          onChangeText={(text) => setQuantityText(text.replace(/[^\d]/g, ""))}
          placeholder="Masalan: 120"
          required
          value={quantityText}
        />

        <TextField
          label="Izoh"
          multiline
          onChangeText={setNote}
          placeholder="Ixtiyoriy izoh"
          value={note}
        />
      </QueryState>
    </Screen>
  );
}
