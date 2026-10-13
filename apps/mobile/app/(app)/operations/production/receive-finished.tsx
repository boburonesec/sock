import {
  formatVariantLabel,
  formatWarehouseZoneName,
  parsePositiveInteger,
  selectWarehouseHandoffInventory,
} from "@paypoq/shared";
import { useRouter } from "expo-router";
import { useState } from "react";

import { useAccess } from "@/lib/access/use-access";
import { useStageInventoryQuery, useWarehouseHandoffStageQuery } from "@/lib/api/production";
import { useCreateFinishedProductReceipt, useWarehouseZonesQuery } from "@/lib/api/warehouse";
import { routes } from "@/lib/routes";
import { Button, SelectField, TextField } from "@/shared/ui/controls";
import { Banner, MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Screen } from "@/shared/ui/screen";
import { formatQuantity } from "@/shared/utils/format";
import { useUiStore } from "@/stores/ui-store";

export default function ReceiveFinishedRoute() {
  return (
    <AreaGuard
      area="production"
      backTo={routes.production}
      endpoint="warehouseCreateFinishedProductReceipt"
      title="Omborga qabul qilish"
    >
      <ReceiveFinishedForm />
    </AreaGuard>
  );
}

function ReceiveFinishedForm() {
  const router = useRouter();
  const access = useAccess();
  const showFlash = useUiStore((state) => state.showFlash);
  const inventoryQuery = useStageInventoryQuery();
  const handoffQuery = useWarehouseHandoffStageQuery();
  // Zones need warehouse.view; the receipt itself only needs warehouse.write.
  const canListZones = access.can("warehouseZones");
  const zonesQuery = useWarehouseZonesQuery(canListZones);
  const mutation = useCreateFinishedProductReceipt();

  const [productVariantId, setProductVariantId] = useState("");
  const [quantityText, setQuantityText] = useState("");
  const [warehouseZoneId, setWarehouseZoneId] = useState("");
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const handoffStage = handoffQuery.data;
  const receivable = selectWarehouseHandoffInventory(inventoryQuery.data ?? [], handoffStage);
  const variantOptions = receivable.map((item) => ({
    value: item.productVariant.id,
    label: formatVariantLabel(item.productVariant),
    description: `${formatQuantity(item.quantity, "dona")} mavjud`,
  }));
  const selected = receivable.find((item) => item.productVariant.id === productVariantId);
  const quantity = parsePositiveInteger(quantityText);
  const errors = {
    variant: !selected ? "Mahsulot varianti tanlanishi kerak." : null,
    quantity: quantity === null ? "Miqdor 0 dan katta butun son bo'lishi kerak." : null,
  };

  async function submit() {
    setShowErrors(true);
    if (errors.variant || errors.quantity || quantity === null) {
      return;
    }

    try {
      const result = await mutation.submit({
        productVariantId,
        quantity,
        warehouseZoneId: warehouseZoneId || null,
        note: note.trim() || undefined,
      });
      if (!result) return;

      showFlash("Tayyor mahsulot omborga qabul qilindi.");
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
            disabled={variantOptions.length === 0}
            label="Omborga qabul qilish"
            loading={mutation.isPending}
            onPress={() => void submit()}
          />
        </>
      }
      subtitle="Topshirish bosqichidagi tayyor mahsulotni ombor qoldig'iga qo'shadi."
      title="Omborga qabul qilish"
    >
      <QueryState queries={canListZones ? [inventoryQuery, handoffQuery, zonesQuery] : [inventoryQuery, handoffQuery]}>
        {handoffStage === null ? (
          <Banner
            message="Omborga topshirish bosqichi sozlanmagan. Manager yoki Owner uni «Smena yakuni» bo'limida tanlashi kerak."
            tone="warning"
          />
        ) : null}
        {handoffStage ? (
          <Banner message={`Topshirish bosqichi: ${handoffStage.name}`} tone="info" />
        ) : null}

        <SelectField
          disabled={variantOptions.length === 0}
          error={showErrors ? errors.variant : null}
          label="Topshirish bosqichidagi mahsulot"
          onChange={setProductVariantId}
          options={variantOptions}
          required
          value={selected ? productVariantId : ""}
        />

        {variantOptions.length === 0 ? (
          <Banner message="Topshirish bosqichida qabul qilinadigan mahsulot yo'q." tone="warning" />
        ) : null}

        <TextField
          error={showErrors ? errors.quantity : null}
          hint={selected ? `Mavjud: ${formatQuantity(selected.quantity, "dona")}` : null}
          keyboardType="number-pad"
          label="Miqdor"
          onChangeText={(text) => setQuantityText(text.replace(/[^\d]/g, ""))}
          placeholder="Masalan: 100"
          required
          value={quantityText}
        />

        {canListZones ? (
          <SelectField
            clearLabel="Tayyor mahsulot zonasi avtomatik"
            label="Zona"
            onChange={setWarehouseZoneId}
            options={(zonesQuery.data ?? []).map((zone) => ({
              value: zone.id,
              label: `${formatWarehouseZoneName(zone.warehouse.name)} · ${formatWarehouseZoneName(zone.name)}`,
            }))}
            placeholder="Tayyor mahsulot zonasi avtomatik"
            value={warehouseZoneId}
          />
        ) : null}

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
