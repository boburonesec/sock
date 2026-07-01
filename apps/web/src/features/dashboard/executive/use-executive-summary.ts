"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/api/query-keys";

export function useExecutiveSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.executiveSummary(),
    queryFn: dashboardApi.getExecutiveSummary,
  });
}
