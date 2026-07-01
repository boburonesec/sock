"use client";

import { useQuery } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/finance";
import { queryKeys } from "@/lib/api/query-keys";

export function useAdvances() {
  return useQuery({
    queryKey: queryKeys.finance.advances(),
    queryFn: financeApi.getAdvances,
  });
}
