"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { warehouseApi } from "@/lib/api/warehouse";

export function useMovements() {
  return useQuery({
    queryKey: queryKeys.warehouse.movements(),
    queryFn: warehouseApi.getMovements,
  });
}
