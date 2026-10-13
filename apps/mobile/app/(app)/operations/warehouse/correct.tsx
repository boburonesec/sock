import {
  formatStockUnit,
  formatVariantLabel,
  normalizeDecimalInput,
  parsePositiveInteger,
  type StockItemType,
} from "@paypoq/shared";
import { useRouter } from "expo-router";
import { useState } from "react";

import { formatLocation } from "@/features/warehouse/format";
import {
  useCatalogProductsQuery,
  useCreateStockCorrection,
  useMaterialStockQuery,
  useProductStockQuery,
  useWarehouseZonesQuery,
} from "@/lib/api/warehouse";
import { routes } from "@/lib/routes";
import { Button, Segmented, SelectField, TextField } from "@/shared/ui/controls";
import { Banner, ConfirmSheet } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Screen } from "@/shared/ui/screen";
import { formatQuantity } from "@/shared/utils/format";
import { useUiStore } from "@/stores/ui-store";

const NO_STOCK_RECORD = "bu zonada yozuv yo'q";

export default function StockCorrectionRoute() {
  return (
    <AreaGuard
      area="warehouse"
      backTo={routes.warehouse}
      endpoint="warehouseCreateStockCorrection"
      title="Qoldiqni tuzatish"
    >
      <StockCorrectionForm />
    </AreaGuard>
  );
}

function StockCorrectionForm() {
  const router = useRouter();
  const showFlash = useUiStore((state) => state.showFlash);
  const productsQuery = useCatalogProductsQuery();
  const zonesQuery = useWarehouseZonesQuery();
  const productStockQuery = useProductStockQuery();
  const materialStockQuery = useMaterialStockQuery();
  const mutation = useCreateStockCorrection();

  const [itemType, setItemType] = useState<StockItemType>("PRODUCT");
  const [productVariantId, setProductVariantId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [warehouseZoneId, setWarehouseZoneId] = useState("");
  const [quantityText, setQuantityText] = useState("");
  const [reason, setReason] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const variantOptions = (productsQuery.data ?? []).flatMap((product) =>
    product.variants.map((variant) => ({ value: variant.id, label: formatVariantLabel(variant) })),
  );
  // Like Web: a material can only be corrected once it has a stock record.
  const materialOptions = Array.from(
    new Map(
      (materialStockQuery.data ?? []).map((stock) => [
        stock.material.id,
        { value: stock.material.id, label: `${stock.material.name} · ${formatStockUnit(stock.unit)}` },
      ]),
    ).values(),
  );
  const zones = zonesQuery.data ?? [];
  const selectedZone = zones.find((zone) => zone.id === warehouseZoneId);

  // Current quantity is shown for context only; the API records the real before/after.
  const currentProduct = (productStockQuery.data ?? []).find(
    (stock) => stock.productVariant.id === productVariantId && stock.zone.id === warehouseZoneId,
  );
  const currentMaterial = (materialStockQuery.data ?? []).find(
    (stock) => stock.material.id === materialId && stock.zone.id === warehouseZoneId,
  );
  const currentQuantityText =
    itemType === "PRODUCT"
      ? productVariantId && warehouseZoneId
        ? currentProduct
          ? formatQuantity(currentProduct.quantity, "dona")
          : NO_STOCK_RECORD
        : null
      : materialId && warehouseZoneId
        ? currentMaterial
          ? formatQuantity(currentMaterial.quantity, formatStockUnit(currentMaterial.unit))
          : NO_STOCK_RECORD
        : null;

  // Finished products are whole pieces; materials allow decimals.
  const newQuantity =
    itemType === "PRODUCT"
      ? quantityText.trim() === "0"
        ? "0"
        : parsePositiveInteger(quantityText) === null
          ? null
          : String(parsePositiveInteger(quantityText))
      : normalizeDecimalInput(quantityText);

  const errors = {
    item:
      itemType === "PRODUCT"
        ? !productVariantId
          ? "Mahsulot varianti tanlanishi kerak."
          : null
        : !materialId
          ? "Material tanlanishi kerak."
          : null,
    zone: !selectedZone ? "Zona tanlanishi kerak." : null,
    quantity:
      newQuantity === null
        ? itemType === "PRODUCT"
          ? "Yangi miqdor 0 yoki undan katta butun son bo'lishi kerak."
          : "Yangi miqdor 0 yoki undan katta bo'lishi kerak."
        : null,
    reason: !reason.trim() ? "Sabab kiritilishi shart." : null,
  };

  function review() {
    setShowErrors(true);
    mutation.reset();
    if (!Object.values(errors).some(Boolean)) {
      setConfirming(true);
    }
  }

  async function submit() {
    if (newQuantity === null) return;

    try {
      const result = await mutation.submit({
        itemType,
        productVariantId: itemType === "PRODUCT" ? productVariantId : null,
        materialId: itemType === "MATERIAL" ? materialId : null,
        warehouseZoneId,
        newQuantity,
        reason: reason.trim(),
      });
      if (!result) return;

      setConfirming(false);
      showFlash("Qoldiq tuzatildi va harakatlar tarixiga yozildi.");
      router.back();
    } catch {
      // The confirmation sheet stays open and shows the API error.
    }
  }

  const selectedItemLabel =
    itemType === "PRODUCT"
      ? variantOptions.find((option) => option.value === productVariantId)?.label
      : materialOptions.find((option) => option.value === materialId)?.label;

  return (
    <Screen
      backTo={routes.warehouse}
      eyebrow="Ombor"
      footer={<Button label="Tekshirish va tuzatish" onPress={review} />}
      subtitle="Joriy qoldiqni tuzatadi va ombor harakatlari tarixiga yozadi."
      title="Qoldiqni tuzatish"
    >
      <QueryState queries={[productsQuery, zonesQuery, productStockQuery, materialStockQuery]}>
        <Segmented
          label="Nima tuzatiladi"
          onChange={(value) => {
            setItemType(value);
            setProductVariantId("");
            setMaterialId("");
            setQuantityText("");
          }}
          options={[
            { value: "PRODUCT", label: "Tayyor mahsulot" },
            { value: "MATERIAL", label: "Material" },
          ]}
          value={itemType}
        />

        {itemType === "PRODUCT" ? (
          <SelectField
            emptyText="Faol mahsulot varianti yo'q."
            error={showErrors ? errors.item : null}
            label="Mahsulot varianti"
            onChange={setProductVariantId}
            options={variantOptions}
            required
            value={productVariantId}
          />
        ) : (
          <SelectField
            emptyText="Qoldig'i mavjud material yo'q."
            error={showErrors ? errors.item : null}
            label="Material"
            onChange={setMaterialId}
            options={materialOptions}
            required
            value={materialId}
          />
        )}

        {itemType === "MATERIAL" && materialOptions.length === 0 ? (
          <Banner
            message="Material qoldig'ini tuzatish uchun avval shu material bo'yicha qoldiq mavjud bo'lishi kerak. Material qabul qilish orqali qoldiq yarating."
            tone="warning"
          />
        ) : null}

        <SelectField
          error={showErrors ? errors.zone : null}
          label="Zona"
          onChange={setWarehouseZoneId}
          options={zones.map((zone) => ({ value: zone.id, label: formatLocation(zone.warehouse, zone) }))}
          required
          value={selectedZone ? warehouseZoneId : ""}
        />

        {currentQuantityText ? (
          <Banner message={`Tizimdagi joriy qoldiq: ${currentQuantityText}`} tone="info" />
        ) : null}

        <TextField
          error={showErrors ? errors.quantity : null}
          keyboardType={itemType === "PRODUCT" ? "number-pad" : "decimal-pad"}
          label="Yangi miqdor"
          onChangeText={setQuantityText}
          placeholder={itemType === "PRODUCT" ? "Masalan: 120" : "Masalan: 25.5"}
          required
          value={quantityText}
        />

        <TextField
          error={showErrors ? errors.reason : null}
          label="Sabab"
          multiline
          onChangeText={setReason}
          placeholder="Masalan: fizik sanoq natijasida tuzatildi"
          required
          value={reason}
        />
      </QueryState>

      <ConfirmSheet
        confirmLabel="Ha, qoldiqni tuzatish"
        description={`${selectedItemLabel ?? ""}\n${selectedZone ? formatLocation(selectedZone.warehouse, selectedZone) : ""}\n\nQoldiq ${newQuantity ?? ""} ga o'zgartiriladi${currentQuantityText ? ` (hozir: ${currentQuantityText})` : ""}. Bu amal harakatlar tarixiga yoziladi va ortga qaytarilmaydi — xato bo'lsa yangi tuzatish kiritiladi.`}
        destructive
        error={mutation.error}
        onCancel={() => {
          setConfirming(false);
          mutation.reset();
        }}
        onConfirm={() => void submit()}
        pending={mutation.isPending}
        title="Qoldiqni tuzatasizmi?"
        visible={confirming}
      />
    </Screen>
  );
}
