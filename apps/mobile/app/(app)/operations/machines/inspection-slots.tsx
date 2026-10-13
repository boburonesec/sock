import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useConfigureInspectionSlots, useMachineLookupsQuery } from "@/lib/api/machines";
import { routes } from "@/lib/routes";
import { spacing } from "@/shared/styles/theme";
import { Button, SelectField, TextField } from "@/shared/ui/controls";
import { Banner, MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { Screen } from "@/shared/ui/screen";

const DEFAULT_OFFSETS = ["0", "120", "240"] as const;

export default function InspectionSlotsRoute() {
  return (
    <AreaGuard
      area="machines"
      backTo={routes.machines}
      endpoint="machinesConfigureInspectionSlots"
      title="Tekshiruv vaqtlari"
    >
      <InspectionSlotsForm />
    </AreaGuard>
  );
}

function parseOffset(value: string): number | null {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

function InspectionSlotsForm() {
  const lookupsQuery = useMachineLookupsQuery();
  const mutation = useConfigureInspectionSlots();
  const [workShiftId, setWorkShiftId] = useState("");
  const [offsets, setOffsets] = useState<string[]>([...DEFAULT_OFFSETS]);
  const [showErrors, setShowErrors] = useState(false);
  const [saved, setSaved] = useState(false);

  const shifts = lookupsQuery.data?.shifts ?? [];
  const parsed = offsets.map(parseOffset);
  const hasInvalidOffset = parsed.some((value) => value === null);

  function selectShift(nextShiftId: string) {
    const shift = shifts.find((item) => item.id === nextShiftId);
    setWorkShiftId(nextShiftId);
    setSaved(false);
    mutation.reset();
    // Start from the saved schedule of that shift, or the defaults.
    setOffsets(
      DEFAULT_OFFSETS.map((fallback, index) => {
        const slot = shift?.inspectionSlots.find((item) => item.slotNumber === index + 1);
        return slot ? String(slot.minuteOffset) : fallback;
      }),
    );
  }

  async function submit() {
    setShowErrors(true);
    setSaved(false);
    if (!workShiftId || hasInvalidOffset) {
      return;
    }

    try {
      const result = await mutation.submit({
        workShiftId,
        slots: parsed.map((minuteOffset, index) => ({
          slotNumber: index + 1,
          minuteOffset: minuteOffset ?? 0,
        })),
      });
      if (!result) return;

      // Show what the API stored, in slot order.
      setOffsets(
        DEFAULT_OFFSETS.map((fallback, index) => {
          const slot = result.find((item) => item.slotNumber === index + 1);
          return slot ? String(slot.minuteOffset) : fallback;
        }),
      );
      setSaved(true);
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
            label="Tekshiruv vaqtlarini saqlash"
            loading={mutation.isPending}
            onPress={() => void submit()}
          />
        </>
      }
      subtitle="Smena boshlanganidan necha daqiqa keyin tekshirilishini kiriting."
      title="Smenadagi tekshiruv vaqtlari"
    >
      <QueryState queries={[lookupsQuery]}>
        {saved ? <Banner message="Smenadagi uchta tekshiruv vaqti saqlandi." tone="success" /> : null}

        <SelectField
          emptyText="Smenalar sozlanmagan."
          error={showErrors && !workShiftId ? "Smena tanlanishi kerak." : null}
          label="Ish smenasi"
          onChange={selectShift}
          options={shifts.map((shift) => ({ value: shift.id, label: shift.name }))}
          required
          value={workShiftId}
        />

        <View style={styles.offsets}>
          {offsets.map((value, index) => (
            <TextField
              error={
                showErrors && parsed[index] === null ? "0 yoki undan katta butun daqiqa kiriting." : null
              }
              key={index}
              keyboardType="number-pad"
              label={`${index + 1}-tekshiruv (daqiqa)`}
              onChangeText={(text) => {
                setSaved(false);
                setOffsets((current) =>
                  current.map((item, position) =>
                    position === index ? text.replace(/[^\d]/g, "") : item,
                  ),
                );
              }}
              required
              value={value}
            />
          ))}
        </View>
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  offsets: {
    gap: spacing.md,
  },
});
