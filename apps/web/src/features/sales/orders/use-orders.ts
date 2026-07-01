"use client";

import { useQuery } from "@tanstack/react-query";
import { salesApi } from "@/lib/api/sales";
import { queryKeys } from "@/lib/api/query-keys";

export function useOrders() {
  return useQuery({
    queryKey: queryKeys.sales.orders(),
    queryFn: salesApi.getOrders,
  });
}
