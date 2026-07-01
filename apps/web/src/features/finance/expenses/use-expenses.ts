"use client";

import { useQuery } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/finance";
import { queryKeys } from "@/lib/api/query-keys";

export function useExpenses() {
  return useQuery({
    queryKey: queryKeys.finance.expenses(),
    queryFn: financeApi.getExpenses,
  });
}
