import {
  DEFAULT_STAGE_MOVEMENT_BATCH_SIZE,
  equalSplitQuantities,
  getInitialStageMovementQuantity,
  parsePositiveInteger,
} from "@paypoq/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import {
  useCreateStageMovement,
  useLookupEmployeesQuery,
  useLookupVariantsQuery,
  useOperationsSummaryQuery,
  useStageInventoryQuery,
} from "@/lib/api/production";
import { routes } from "@/lib/routes";
import { colors, radius, spacing, touchTarget, typography } from "@/shared/styles/theme";
import { Button, CheckRow, SelectField, TextField } from "@/shared/ui/controls";
import { Banner, MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Card, KeyValueList, Section } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { formatQuantity } from "@/shared/utils/format";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";

export default function MoveStageRoute() {
  return (
    <AreaGuard
      area="production"
      backTo={routes.production}
      endpoint="productionCreateStageMovement"
      title="Keyingi bosqichga o'tkazish"
    >
      <MoveStageForm />
    </AreaGuard>
  );
}

function toShareText(shares: Record<string, number>): Record<string, string> {
  return Object.fromEntries(Object.entries(shares).map(([id, qty]) => [id, String(qty)]));
}

function MoveStageForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ stageId?: string }>();
  const showFlash = useUiStore((state) => state.showFlash);
  const activeFactoryId = useAuthStore((state) => state.activeFactoryId);
  const accessibleFactories = useAuthStore((state) => state.accessibleFactories);
  const summaryQuery = useOperationsSummaryQuery();
  const inventoryQuery = useStageInventoryQuery();
  const variantsQuery = useLookupVariantsQuery();
  const employeesQuery = useLookupEmployeesQuery();
  const mutation = useCreateStageMovement();

  const [sourceStageId, setSourceStageId] = useState(params.stageId ?? "");
  const [productVariantId, setProductVariantId] = useState("");
  const [quantityText, setQuantityText] = useState("");
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [shares, setShares] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  // Shares follow the total until the operator edits one by hand.
  const sharesAreAutomatic = useRef(true);

  const inventory = inventoryQuery.data ?? [];
  const stages = [...(summaryQuery.data?.stageTotals ?? [])].sort(
    (first, second) => first.sortOrder - second.sortOrder,
  );
  const stageOptions = stages
    .filter((stage) => inventory.some((item) => item.stage.id === stage.stageId && item.quantity > 0))
    .map((stage) => ({
      value: stage.stageId,
      label: stage.stageName,
      description: `${formatQuantity(stage.quantity, "dona")} mavjud`,
    }));
  // A preselected stage that has since emptied is not offered any more.
  const activeStageId = stageOptions.some((option) => option.value === sourceStageId)
    ? sourceStageId
    : "";
  const sourceStage = stages.find((stage) => stage.stageId === activeStageId);
  const destinationStage = sourceStage
    ? stages.find((stage) => stage.sortOrder > sourceStage.sortOrder)
    : undefined;

  const variantLabels = new Map((variantsQuery.data ?? []).map((item) => [item.id, item.label]));
  const variantOptions = inventory
    .filter(
      (item) =>
        item.stage.id === activeStageId && item.quantity > 0 && variantLabels.has(item.productVariant.id),
    )
    .map((item) => ({
      value: item.productVariant.id,
      label: variantLabels.get(item.productVariant.id) ?? item.productVariant.product.name,
      description: `${formatQuantity(item.quantity, "dona")} mavjud`,
    }));
  const activeVariantId = variantOptions.some((option) => option.value === productVariantId)
    ? productVariantId
    : "";
  const availableQuantity =
    inventory.find(
      (item) => item.stage.id === activeStageId && item.productVariant.id === activeVariantId,
    )?.quantity ?? 0;

  // Only workers assigned to the source stage (the API enforces the same rule).
  const stageEmployees = (employeesQuery.data ?? []).filter((employee) =>
    employee.stages.some((stage) => stage.id === activeStageId),
  );
  const selectedEmployees = stageEmployees.filter((employee) => employeeIds.includes(employee.id));
  const selectedIds = selectedEmployees.map((employee) => employee.id);
  const quantity = parsePositiveInteger(quantityText);
  const shareSum = selectedIds.reduce((sum, id) => sum + (parsePositiveInteger(shares[id] ?? "") ?? 0), 0);
  const selectedShifts = Array.from(
    new Set(
      selectedEmployees
        .map((employee) => employee.workShift?.name)
        .filter((name): name is string => Boolean(name)),
    ),
  );

  const errors = {
    stage: !activeStageId ? "Boshlang'ich bosqich tanlanishi kerak." : null,
    destination: activeStageId && !destinationStage ? "Bu bosqichdan keyingi bosqich mavjud emas." : null,
    variant: !activeVariantId ? "Mahsulot varianti tanlanishi kerak." : null,
    quantity:
      quantity === null
        ? "Miqdor 0 dan katta butun son bo'lishi kerak."
        : quantity > availableQuantity
          ? `Bu bosqichda faqat ${availableQuantity} dona mavjud.`
          : quantity < selectedIds.length
            ? "Miqdor tanlangan ishchilar sonidan kam bo'lmasin (har biriga kamida 1 dona)."
            : null,
    employees: selectedIds.length === 0 ? "Kamida bitta ishchi tanlanishi shart." : null,
    shares:
      selectedIds.length > 0 && selectedIds.some((id) => parsePositiveInteger(shares[id] ?? "") === null)
        ? "Har bir ishchiga kamida 1 dona butun son yozing."
        : selectedIds.length > 0 && quantity !== null && shareSum !== quantity
          ? "Ishchilar miqdorlari yig'indisi umumiy miqdorga teng bo'lishi kerak."
          : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  function applyEqualSplit(ids: string[], total: number | null) {
    sharesAreAutomatic.current = true;
    setShares(total ? toShareText(equalSplitQuantities(total, ids)) : {});
  }

  function changeStage(nextStageId: string) {
    setSourceStageId(nextStageId);
    // Workers of another stage are not valid for this one.
    setProductVariantId("");
    setQuantityText("");
    setEmployeeIds([]);
    setShares({});
    sharesAreAutomatic.current = true;
    mutation.reset();
  }

  function changeVariant(nextVariantId: string) {
    setProductVariantId(nextVariantId);
    const available =
      inventory.find(
        (item) => item.stage.id === activeStageId && item.productVariant.id === nextVariantId,
      )?.quantity ?? 0;
    const initial = getInitialStageMovementQuantity(DEFAULT_STAGE_MOVEMENT_BATCH_SIZE, available);
    setQuantityText(initial > 0 ? String(initial) : "");
    if (sharesAreAutomatic.current) {
      applyEqualSplit(selectedIds, initial);
    }
    mutation.reset();
  }

  function changeQuantity(text: string) {
    const digits = text.replace(/[^\d]/g, "");
    setQuantityText(digits);
    const next = parsePositiveInteger(digits);
    if (sharesAreAutomatic.current && next !== null && selectedIds.length > 0) {
      applyEqualSplit(selectedIds, next);
    }
  }

  function toggleEmployee(employeeId: string) {
    const next = selectedIds.includes(employeeId)
      ? selectedIds.filter((id) => id !== employeeId)
      : [...selectedIds, employeeId];
    setEmployeeIds(next);
    if (sharesAreAutomatic.current) {
      applyEqualSplit(next, quantity);
    } else {
      setShares((current) =>
        Object.fromEntries(next.filter((id) => current[id] !== undefined).map((id) => [id, current[id] ?? ""])),
      );
    }
  }

  async function submit() {
    setShowErrors(true);
    if (hasErrors || quantity === null || !destinationStage) {
      return;
    }

    try {
      const result = await mutation.submit({
        sourceStageId: activeStageId,
        destinationStageId: destinationStage.stageId,
        productVariantId: activeVariantId,
        quantity,
        employeeIds: selectedIds,
        workerShares: selectedIds.map((employeeId) => ({
          employeeId,
          quantity: parsePositiveInteger(shares[employeeId] ?? "") ?? 0,
        })),
        note: note.trim() || undefined,
      });
      if (!result) return;

      showFlash(
        `${result.stageMovement.quantity} dona «${result.sourceStageInventoryBefore.stage.name}» bosqichidan «${result.destinationStageInventory.stage.name}» bosqichiga o'tkazildi. Manba qoldig'i: ${result.sourceStageInventoryBefore.quantity} → ${result.sourceStageInventory.quantity} dona. Qabul qiluvchi bosqich qoldig'i: ${result.destinationStageInventoryBefore?.quantity ?? 0} → ${result.destinationStageInventory.quantity} dona.`,
      );
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
            disabled={!activeStageId || !activeVariantId || availableQuantity < 1}
            label="Keyingi bosqichga o'tkazish"
            loading={mutation.isPending}
            onPress={() => void submit()}
          />
        </>
      }
      subtitle="Mahsulotni keyingi bosqichga o'tkazing va ishlagan ishchilarni tanlang."
      title="Keyingi bosqichga o'tkazish"
    >
      <QueryState queries={[summaryQuery, inventoryQuery, variantsQuery, employeesQuery]}>
        {stageOptions.length === 0 ? (
          <Banner
            message="Hech bir bosqichda o'tkaziladigan mahsulot yo'q. Avval stanokdan chiqqan mahsulotni qabul qiling."
            tone="warning"
          />
        ) : null}

        <SelectField
          error={showErrors ? errors.stage : null}
          label="Qayerdan (ishlangan bosqich)"
          onChange={changeStage}
          options={stageOptions}
          required
          value={activeStageId}
        />

        <TextField
          editable={false}
          error={showErrors ? errors.destination : null}
          hint="Keyingi bosqich tizim tomonidan belgilanadi."
          label="Qayerga"
          onChangeText={() => undefined}
          placeholder="Avval bosqichni tanlang"
          value={destinationStage?.stageName ?? ""}
        />

        <SelectField
          disabled={!activeStageId}
          emptyText="Bu bosqichda o'tkaziladigan mahsulot yo'q."
          error={showErrors ? errors.variant : null}
          label="Mahsulot"
          onChange={changeVariant}
          options={variantOptions}
          placeholder={activeStageId ? "Tanlang" : "Avval bosqichni tanlang"}
          required
          value={activeVariantId}
        />

        {activeVariantId ? (
          <Banner
            message={`Tanlangan mahsulotdan bu bosqichda ${formatQuantity(availableQuantity, "dona")} mavjud.`}
            tone={availableQuantity > 0 ? "success" : "warning"}
          />
        ) : null}

        <TextField
          error={showErrors && activeVariantId ? errors.quantity : null}
          keyboardType="number-pad"
          label="Miqdor (dona)"
          onChangeText={changeQuantity}
          placeholder="Masalan: 500"
          required
          value={quantityText}
        />

        <Section
          description="Faqat «Qayerdan» bosqichiga biriktirilgan ishchilar. Har biriga dona yozing (yig'indi = umumiy miqdor)."
          title="Kim ishladi?"
        >
          {!activeStageId ? (
            <Banner message="Avval «Qayerdan» bosqichini tanlang." tone="info" />
          ) : stageEmployees.length === 0 ? (
            <Banner
              message="Bu bosqichga biriktirilgan faol ishchi yo'q. Xodimlar bo'limida bosqich biriktiring."
              tone="warning"
            />
          ) : (
            stageEmployees.map((employee) => (
              <CheckRow
                checked={selectedIds.includes(employee.id)}
                disabled={mutation.isPending}
                key={employee.id}
                label={employee.name}
                onToggle={() => toggleEmployee(employee.id)}
              >
                <TextInput
                  accessibilityLabel={`${employee.name} miqdori`}
                  keyboardType="number-pad"
                  onChangeText={(text) => {
                    sharesAreAutomatic.current = false;
                    setShares((current) => ({ ...current, [employee.id]: text.replace(/[^\d]/g, "") }));
                  }}
                  placeholder="dona"
                  placeholderTextColor={colors.textMuted}
                  style={styles.shareInput}
                  value={shares[employee.id] ?? ""}
                />
              </CheckRow>
            ))
          )}

          {selectedIds.length > 0 ? (
            <View style={styles.shareSummary}>
              <Text style={styles.shareText}>
                {"Yig'indi: "}
                <Text style={shareSum === quantity ? styles.shareOk : styles.shareWarn}>{shareSum}</Text>
                {` / ${quantity ?? "—"} dona`}
              </Text>
              <View style={styles.splitButton}>
                <Button
                  disabled={mutation.isPending}
                  label="Teng bo'lish"
                  onPress={() => applyEqualSplit(selectedIds, quantity ?? 1)}
                  variant="secondary"
                />
              </View>
            </View>
          ) : null}
          {showErrors && errors.employees ? <Banner message={errors.employees} tone="error" /> : null}
          {showErrors && !errors.employees && errors.shares ? (
            <Banner message={errors.shares} tone="error" />
          ) : null}
        </Section>

        <TextField
          label="Izoh"
          multiline
          onChangeText={setNote}
          placeholder="Ixtiyoriy izoh"
          value={note}
        />

        <Card tone="accent">
          <Text style={styles.reviewTitle}>{"O'tkazishdan oldin tekshiring"}</Text>
          <KeyValueList
            items={[
              {
                label: "Fabrika",
                value:
                  accessibleFactories.find((factory) => factory.id === activeFactoryId)?.name ??
                  "Fabrika tanlanmagan",
              },
              { label: "Smena", value: selectedShifts.join(", ") || "Ishchi tanlang" },
              {
                label: "Mahsulot",
                value: variantOptions.find((option) => option.value === activeVariantId)?.label ?? "Tanlanmagan",
              },
              { label: "Joriy bosqich", value: sourceStage?.stageName ?? "Tanlanmagan" },
              {
                label: "Mavjud qoldiq",
                value: activeVariantId ? formatQuantity(availableQuantity, "dona") : "—",
              },
              { label: "Keyingi bosqich", value: destinationStage?.stageName ?? "Mavjud emas" },
              {
                label: "O'tkaziladigan miqdor",
                value: quantity ? formatQuantity(quantity, "dona") : "—",
              },
            ]}
          />
        </Card>
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shareInput: {
    width: 92,
    minHeight: touchTarget - 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    fontSize: typography.body,
    textAlign: "right",
    backgroundColor: colors.surfaceRaised,
  },
  shareSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  shareText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: typography.body,
  },
  shareOk: {
    color: colors.success,
    fontWeight: "800",
  },
  shareWarn: {
    color: colors.warningText,
    fontWeight: "800",
  },
  splitButton: {
    minWidth: 140,
  },
  reviewTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
});
