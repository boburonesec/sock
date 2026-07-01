"use client";

import { useQuery } from "@tanstack/react-query";
import { productionApi } from "@/lib/api/production";
import { queryKeys } from "@/lib/api/query-keys";

export function useProductionBoardData() {
  const summaryQuery = useQuery({
    queryKey: queryKeys.production.operationsSummary(),
    queryFn: productionApi.getOperationsSummary,
  });
  const inventoryQuery = useQuery({
    queryKey: queryKeys.production.stageInventory(),
    queryFn: productionApi.getStageInventory,
  });
  const movementsQuery = useQuery({
    queryKey: queryKeys.production.recentMovements(),
    queryFn: productionApi.getRecentMovements,
  });

  const error = summaryQuery.error ?? inventoryQuery.error ?? movementsQuery.error;

  return {
    summary: summaryQuery.data?.data,
    inventory: inventoryQuery.data?.data ?? [],
    movements: movementsQuery.data?.data ?? [],
    isPending:
      summaryQuery.isPending || inventoryQuery.isPending || movementsQuery.isPending,
    isError: summaryQuery.isError || inventoryQuery.isError || movementsQuery.isError,
    error,
    refetch: () =>
      Promise.all([
        summaryQuery.refetch(),
        inventoryQuery.refetch(),
        movementsQuery.refetch(),
      ]),
  };
}
