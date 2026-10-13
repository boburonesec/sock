import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { mobileQueryClient } from "@/providers/query-cache";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { useAuthStore } from "@/stores/auth-store";

export { clearMobileQueryCache } from "@/providers/query-cache";

export function AppProviders({ children }: { children: ReactNode }) {
  const initializeSession = useAuthStore((state) => state.initializeSession);
  const hasLoadedSession = useAuthStore((state) => state.hasLoadedSession);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (hasStarted) {
      return;
    }

    setHasStarted(true);
    void initializeSession();
  }, [hasStarted, initializeSession]);

  return (
    <QueryClientProvider client={mobileQueryClient}>
      {hasLoadedSession ? children : <LoadingScreen label="Paypoq Mobile yuklanmoqda" />}
    </QueryClientProvider>
  );
}

