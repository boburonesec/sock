"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { salesApi } from "@/lib/api/sales";

export function useClientDebts() {
  return useQuery({
    queryKey: queryKeys.sales.debts(),
    queryFn: salesApi.getDebts,
  });
}
