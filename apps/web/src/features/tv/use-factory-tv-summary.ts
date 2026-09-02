"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { dashboardApi } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/api/query-keys";

export function useFactoryTvSummary() {
  // Each factory's TV link carries its own token (?token=...), generated per
  // factory in Sozlamalar. No token falls back to the legacy shared one.
  const token = useSearchParams().get("token");

  return useQuery({
    queryKey: [...queryKeys.dashboard.factoryTvSummary(), token],
    queryFn: () => dashboardApi.getFactoryTvSummary(token),
    refetchInterval: 60_000,
  });
}
