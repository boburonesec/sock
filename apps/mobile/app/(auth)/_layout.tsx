import { Redirect, Stack } from "expo-router";

import { LoadingScreen } from "@/shared/ui/loading-screen";
import { useAuthStore } from "@/stores/auth-store";

export default function AuthLayout() {
  const hasLoadedSession = useAuthStore((state) => state.hasLoadedSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!hasLoadedSession) {
    return <LoadingScreen label="Sessiya tekshirilmoqda" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

