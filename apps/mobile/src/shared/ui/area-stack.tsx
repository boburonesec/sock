import { Stack } from "expo-router";

import { colors } from "@/shared/styles/theme";

/** Headerless nested stack used by every tab; screens render their own header. */
export function AreaStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
