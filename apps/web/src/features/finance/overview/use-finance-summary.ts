"use client";

import { useQuery } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/finance";
import { queryKeys } from "@/lib/api/query-keys";

export function useFinanceSummary() {
  return useQuery({
    queryKey: queryKeys.finance.summary(),
    queryFn: financeApi.getSummary,
  });
}
