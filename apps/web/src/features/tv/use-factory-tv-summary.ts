"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/api/query-keys";

export function useFactoryTvSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.factoryTvSummary(),
    queryFn: dashboardApi.getFactoryTvSummary,
    refetchInterval: 60_000,
  });
}
