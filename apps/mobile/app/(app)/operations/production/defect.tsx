import { MIN_REASON_LENGTH, parsePositiveInteger } from "@paypoq/shared";
import { useRouter } from "expo-router";
import { useState } from "react";

import {
  useCreateDefect,
  useLookupEmployeesQuery,
  useLookupVariantsQuery,
  useOperationsSummaryQuery,
} from "@/lib/api/production";
import { routes } from "@/lib/routes";
import { Button, SelectField, TextField } from "@/shared/ui/controls";
import { Banner, MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Screen } from "@/shared/ui/screen";
import { useUiStore } from "@/stores/ui-store";

export default function DefectRoute() {
  return (
    <AreaGuard
      area="production"
      backTo={routes.production}
      endpoint="productionCreateDefect"
      title="Brak qayd qilish"
    >
      <DefectForm />
    </AreaGuard>
  );
}

function DefectForm() {
  const router = useRouter();
  const showFlash = useUiStore((state) => state.showFlash);
  const summaryQuery = useOperationsSummaryQuery();
  const variantsQuery = useLookupVariantsQuery();
  const employeesQuery = useLookupEmployeesQuery();
  const mutation = useCreateDefect();

  const [employeeId, setEmployeeId] = useState("");
  const [stageId, setStageId] = useState("");
  const [productVariantId, setProductVariantId] = useState("");
  const [quantityText, setQuantityText] = useState("");
  const [reason, setReason] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const quantity = parsePositiveInteger(quantityText);
  const errors = {
    quantity: quantity === null ? "Miqdor 0 dan katta butun son bo'lishi kerak." : null,
    reason:
      reason.trim().length < MIN_REASON_LENGTH
        ? "Sabab kamida 3 ta belgidan iborat bo'lishi kerak."
        : null,
  };

  async function submit() {
    setShowErrors(true);
    if (errors.quantity || errors.reason || quantity === null) {
      return;
    }

    try {
      const result = await mutation.submit({
        employeeId: employeeId || null,
        stageId: stageId || null,
        productVariantId: productVariantId || null,
        quantity,
        reason: reason.trim(),
      });
      if (!result) return;

      showFlash("Brak qayd qilindi.");
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
          <Button label="Brak qayd qilish" loading={mutation.isPending} onPress={() => void submit()} />
        </>
      }
      subtitle="Brakni audit qilinadigan yozuv sifatida qayd qiladi."
      title="Brak qayd qilish"
    >
      <QueryState queries={[summaryQuery, variantsQuery, employeesQuery]}>
        <SelectField
          clearLabel="Tanlanmagan"
          label="Ishchi"
          onChange={setEmployeeId}
          options={(employeesQuery.data ?? []).map((employee) => ({
            value: employee.id,
            label: employee.name,
          }))}
          placeholder="Tanlanmagan"
          value={employeeId}
        />

        <SelectField
          clearLabel="Tanlanmagan"
          label="Bosqich"
          onChange={setStageId}
          options={[...(summaryQuery.data?.stageTotals ?? [])]
            .sort((first, second) => first.sortOrder - second.sortOrder)
            .map((stage) => ({ value: stage.stageId, label: stage.stageName }))}
          placeholder="Tanlanmagan"
          value={stageId}
        />

        <SelectField
          clearLabel="Tanlanmagan"
          label="Mahsulot varianti"
          onChange={setProductVariantId}
          options={(variantsQuery.data ?? []).map((variant) => ({
            value: variant.id,
            label: variant.label,
          }))}
          placeholder="Tanlanmagan"
          value={productVariantId}
        />

        <TextField
          error={showErrors ? errors.quantity : null}
          keyboardType="number-pad"
          label="Miqdor"
          onChangeText={(text) => setQuantityText(text.replace(/[^\d]/g, ""))}
          placeholder="Masalan: 3"
          required
          value={quantityText}
        />

        <TextField
          error={showErrors ? errors.reason : null}
          label="Sabab"
          multiline
          onChangeText={setReason}
          placeholder="Masalan: ip uzilishi, sifatsiz tikuv..."
          required
          value={reason}
        />

        <Banner
          message="Nuqson hozircha faqat qayd qilinadi. Ish haqi, jarima va bosqichdagi qoldiq avtomatik o'zgarmaydi."
          tone="warning"
        />
      </QueryState>
    </Screen>
  );
}
