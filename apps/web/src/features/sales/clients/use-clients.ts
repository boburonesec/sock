"use client";

import { useQuery } from "@tanstack/react-query";
import { salesApi } from "@/lib/api/sales";
import { queryKeys } from "@/lib/api/query-keys";

export function useClients() {
  return useQuery({
    queryKey: queryKeys.sales.clients(),
    queryFn: salesApi.getClients,
  });
}
