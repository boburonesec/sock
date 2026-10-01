import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api/errors";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { useAuthStore } from "@/stores/auth-store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 4xx (not linked, no permission) will not change on retry; only retry
      // transient network/5xx failures once.
      retry: (failureCount, error) =>
        failureCount < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
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

