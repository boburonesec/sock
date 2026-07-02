import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { LoadingScreen } from "@/shared/ui/loading-screen";
import { useAuthStore } from "@/stores/auth-store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      {hasLoadedSession ? children : <LoadingScreen label="Paypoq Mobile yuklanmoqda" />}
    </QueryClientProvider>
  );
}

export function clearMobileQueryCache() {
  queryClient.clear();
}

