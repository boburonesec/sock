"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { warehouseApi } from "@/lib/api/warehouse";

export function useMaterials() {
  return useQuery({
    queryKey: queryKeys.warehouse.materialStock(),
    queryFn: warehouseApi.getMaterialStock,
  });
}
