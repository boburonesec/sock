import { useRouter } from "expo-router";
import { useState } from "react";

import { useCreateMachine } from "@/lib/api/machines";
import { routes } from "@/lib/routes";
import { Button, TextField } from "@/shared/ui/controls";
import { MutationError } from "@/shared/ui/feedback";
import { AreaGuard } from "@/shared/ui/guard";
import { Screen } from "@/shared/ui/screen";
import { useUiStore } from "@/stores/ui-store";

export default function NewMachineRoute() {
  return (
    <AreaGuard area="machines" backTo={routes.machines} endpoint="machinesCreate" title="Stanok qo'shish">
      <NewMachineForm />
    </AreaGuard>
  );
}

function NewMachineForm() {
  const router = useRouter();
  const showFlash = useUiStore((state) => state.showFlash);
  const mutation = useCreateMachine();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const errors = {
    code: !code.trim() ? "Stanok kodi kiritilishi kerak." : null,
    name: !name.trim() ? "Stanok nomi kiritilishi kerak." : null,
  };

  async function submit() {
    setShowErrors(true);
    if (errors.code || errors.name) {
      return;
    }

    try {
      const result = await mutation.submit({ code: code.trim(), name: name.trim() });
      if (!result) return;

      showFlash("Stanok muvaffaqiyatli qo'shildi.");
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
          <Button label="Saqlash" loading={mutation.isPending} onPress={() => void submit()} />
        </>
      }
      subtitle="Yangi stanokning zavoddagi kodi va nomini kiriting."
      title="Stanok qo'shish"
    >
      <TextField
        autoCapitalize="characters"
        error={showErrors ? errors.code : null}
        label="Stanok kodi"
        onChangeText={setCode}
        placeholder="Masalan: ST-01"
        required
        value={code}
      />
      <TextField
        error={showErrors ? errors.name : null}
        label="Stanok nomi"
        onChangeText={setName}
        placeholder="Stanok nomi"
        required
        value={name}
      />
    </Screen>
  );
}
