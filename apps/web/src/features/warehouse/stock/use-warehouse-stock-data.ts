"use client";

import { useQuery } from "@tanstack/react-query";
import { warehouseApi } from "@/lib/api/warehouse";
import { queryKeys } from "@/lib/api/query-keys";

export function useWarehouseStockData() {
  const stockQuery = useQuery({
    queryKey: queryKeys.warehouse.stock(),
    queryFn: warehouseApi.getStock,
  });
  const materialStockQuery = useQuery({
    queryKey: queryKeys.warehouse.materialStock(),
    queryFn: warehouseApi.getMaterialStock,
  });
  const summaryQuery = useQuery({
    queryKey: queryKeys.warehouse.stockSummary(),
    queryFn: warehouseApi.getStockSummary,
  });

  const error = stockQuery.error ?? materialStockQuery.error ?? summaryQuery.error;

  return {
    stock: stockQuery.data?.data ?? [],
    materialStock: materialStockQuery.data?.data ?? [],
    summary: summaryQuery.data?.data,
    isPending:
      stockQuery.isPending || materialStockQuery.isPending || summaryQuery.isPending,
    isError:
      stockQuery.isError || materialStockQuery.isError || summaryQuery.isError,
    error,
    refetch: () =>
      Promise.all([
        stockQuery.refetch(),
        materialStockQuery.refetch(),
        summaryQuery.refetch(),
      ]),
  };
}
