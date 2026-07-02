import { Redirect } from "expo-router";

import { LoadingScreen } from "@/shared/ui/loading-screen";
import { useAuthStore } from "@/stores/auth-store";

export default function IndexRoute() {
  const hasLoadedSession = useAuthStore((state) => state.hasLoadedSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!hasLoadedSession) {
    return <LoadingScreen label="Sessiya tekshirilmoqda" />;
  }

  return <Redirect href={isAuthenticated ? "/(app)/home" : "/(auth)/login"} />;
}

