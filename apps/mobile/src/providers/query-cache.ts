import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";

export const mobileQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        failureCount < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      staleTime: 30_000,
    },
    mutations: { retry: false },
  },
});

export function clearMobileQueryCache() {
  mobileQueryClient.clear();
}
