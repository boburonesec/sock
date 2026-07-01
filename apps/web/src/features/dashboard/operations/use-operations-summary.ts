"use client";

import { useQuery } from "@tanstack/react-query";
import { productionApi } from "@/lib/api/production";
import { queryKeys } from "@/lib/api/query-keys";

export function useOperationsSummary() {
  return useQuery({
    queryKey: queryKeys.production.operationsSummary(),
    queryFn: productionApi.getOperationsSummary,
  });
}
