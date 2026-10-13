import {
  formatWarehouseZoneName,
  isPositiveDecimalString,
  normalizeDecimalInput,
} from "@paypoq/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { formatLocation } from "@/features/warehouse/format";
import {
  useCatalogMaterialsQuery,
  useCreateMaterialReceipt,
  useMaterialStockQuery,
  useWarehouseZonesQuery,
} from "@/lib/api/warehouse";
import { routes } from "@/lib/routes";
import { colors, typography } from "@/shared/styles/theme";
import { Button, SelectField, TextField } from "@/shared/ui/controls";
import { Banner, MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Card, KeyValueList } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";

export default function ReceiveMaterialRoute() {
  return (
    <AreaGuard
      area="warehouse"
      backTo={routes.warehouse}
      endpoint="warehouseCreateMaterialReceipt"
      title="Material qabul qilish"
    >
      <ReceiveMaterialForm />
    </AreaGuard>
  );
}

function ReceiveMaterialForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ materialId?: string; zoneId?: string }>();
  const showFlash = useUiStore((state) => state.showFlash);
  const activeFactoryId = useAuthStore((state) => state.activeFactoryId);
  const accessibleFactories = useAuthStore((state) => state.accessibleFactories);
  const materialsQuery = useCatalogMaterialsQuery();
  const zonesQuery = useWarehouseZonesQuery();
  const stockQuery = useMaterialStockQuery();
  const mutation = useCreateMaterialReceipt();

  const [materialId, setMaterialId] = useState(params.materialId ?? "");
  const [quantityText, setQuantityText] = useState("");
  const [unitText, setUnitText] = useState("");
  const [warehouseZoneId, setWarehouseZoneId] = useState(params.zoneId ?? "");
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const materials = materialsQuery.data ?? [];
  const zones = zonesQuery.data ?? [];
  const selectedMaterial = materials.find((item) => item.id === materialId);
  const selectedZone = zones.find((item) => item.id === warehouseZoneId);

  // A material has no unit of its own: the unit lives on its stock rows. Once
  // a material is tracked in a unit, later receipts must use the same one, so
  // the most recently updated row decides and the field is locked.
  const establishedUnits = useMemo(() => {
    const map = new Map<string, { unit: string; updatedAt: string }>();
    for (const stock of stockQuery.data ?? []) {
      const existing = map.get(stock.material.id);
      if (!existing || stock.updatedAt > existing.updatedAt) {
        map.set(stock.material.id, { unit: stock.unit, updatedAt: stock.updatedAt });
      }
    }
    return map;
  }, [stockQuery.data]);
  const establishedUnit = materialId ? establishedUnits.get(materialId)?.unit : undefined;
  const unit = (establishedUnit ?? unitText).trim();
  const quantity = normalizeDecimalInput(quantityText);

  const errors = {
    material: !selectedMaterial ? "Material tanlanishi kerak." : null,
    quantity:
      quantity === null || !isPositiveDecimalString(quantity)
        ? "Miqdor musbat son bo'lishi kerak."
        : null,
    unit: !unit ? "Birlik kiritilishi shart." : null,
    zone: !selectedZone ? "Ombor joyi tanlanishi kerak." : null,
  };

  async function submit() {
    setShowErrors(true);
    if (Object.values(errors).some(Boolean) || quantity === null) {
      return;
    }

    try {
      const result = await mutation.submit({
        materialId,
        quantity,
        unit,
        warehouseZoneId,
        note: note.trim() || undefined,
      });
      if (!result) return;

      const stock = result.materialStock;
      showFlash(
        `${stock.material.name}: ${result.stockMovement.quantity} ${stock.unit} «${formatLocation(stock.warehouse, stock.zone)}» joyiga qabul qilindi. Yangi qoldiq: ${stock.quantity} ${stock.unit}.`,
      );
      router.back();
    } catch {
      // The API message is rendered from mutation.error; the form keeps its values.
    }
  }

  return (
    <Screen
      backTo={routes.warehouse}
      eyebrow="Ombor"
      footer={
        <>
          <MutationError error={mutation.error} />
          <Button
            disabled={materials.length === 0}
            label="Materialni qabul qilish"
            loading={mutation.isPending}
            onPress={() => void submit()}
          />
        </>
      }
      subtitle="Xomashyo kirimi ombor qoldig'ini oshiradi va harakatlar tarixiga yoziladi."
      title="Material qabul qilish"
    >
      <QueryState queries={[materialsQuery, zonesQuery, stockQuery]}>
        {materials.length === 0 ? (
          <Banner
            message="Material qabul qilish uchun avval asosiy ma'lumotlarda material mavjud bo'lishi kerak."
            tone="warning"
          />
        ) : null}

        <SelectField
          error={showErrors ? errors.material : null}
          label="Material"
          onChange={(value) => {
            setMaterialId(value);
            setUnitText("");
          }}
          options={materials.map((material) => ({ value: material.id, label: material.name }))}
          required
          value={selectedMaterial ? materialId : ""}
        />

        <TextField
          error={showErrors ? errors.quantity : null}
          keyboardType="decimal-pad"
          label="Miqdor"
          onChangeText={setQuantityText}
          placeholder="Masalan: 25.5"
          required
          value={quantityText}
        />

        <TextField
          autoCapitalize="none"
          editable={!establishedUnit}
          error={showErrors ? errors.unit : null}
          hint={
            establishedUnit
              ? "Bu material uchun tizimda saqlangan birlik — o'zgartirib bo'lmaydi."
              : materialId
                ? "Bu material uchun birlik hali belgilanmagan — birinchi qabulda kiriting."
                : null
          }
          label="Birlik"
          onChangeText={setUnitText}
          placeholder="kg, roll, dona..."
          required
          value={establishedUnit ?? unitText}
        />

        <SelectField
          error={showErrors ? errors.zone : null}
          label="Ombor joyi"
          onChange={setWarehouseZoneId}
          options={zones.map((zone) => ({
            value: zone.id,
            label: formatLocation(zone.warehouse, zone),
          }))}
          placeholder="Ombor va joyni tanlang"
          required
          value={selectedZone ? warehouseZoneId : ""}
        />

        <TextField
          label="Izoh"
          multiline
          onChangeText={setNote}
          placeholder="Ixtiyoriy izoh"
          value={note}
        />

        <Card tone="accent">
          <Text style={styles.reviewTitle}>Qabul qilishdan oldin tekshiring</Text>
          <KeyValueList
            items={[
              {
                label: "Fabrika",
                value:
                  accessibleFactories.find((factory) => factory.id === activeFactoryId)?.name ??
                  "Fabrika tanlanmagan",
              },
              {
                label: "Ombor",
                value: selectedZone ? formatWarehouseZoneName(selectedZone.warehouse.name) : "Tanlanmagan",
              },
              {
                label: "Ombor joyi",
                value: selectedZone ? formatWarehouseZoneName(selectedZone.name) : "Tanlanmagan",
              },
              { label: "Material", value: selectedMaterial?.name ?? "Tanlanmagan" },
              { label: "Miqdor va birlik", value: quantity && unit ? `${quantity} ${unit}` : "—" },
            ]}
          />
        </Card>
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  reviewTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
});
