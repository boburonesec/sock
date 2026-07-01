"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { warehouseApi } from "@/lib/api/warehouse";

export function useZonesData() {
  const summaryQuery = useQuery({
    queryKey: queryKeys.warehouse.stockSummary(),
    queryFn: warehouseApi.getStockSummary,
  });
  const zonesQuery = useQuery({
    queryKey: queryKeys.warehouse.zones(),
    queryFn: warehouseApi.getZones,
  });
  const stockQuery = useQuery({
    queryKey: queryKeys.warehouse.stock(),
    queryFn: warehouseApi.getStock,
  });
  const materialStockQuery = useQuery({
    queryKey: queryKeys.warehouse.materialStock(),
    queryFn: warehouseApi.getMaterialStock,
  });
  const movementsQuery = useQuery({
    queryKey: queryKeys.warehouse.movements(),
    queryFn: warehouseApi.getMovements,
  });

  return { summaryQuery, zonesQuery, stockQuery, materialStockQuery, movementsQuery };
}
