"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { reportsApi } from "@/lib/api/reports";

export function useReportsOverview() {
  return useQuery({
    queryKey: queryKeys.reports.overview(),
    queryFn: reportsApi.getOverview,
  });
}
