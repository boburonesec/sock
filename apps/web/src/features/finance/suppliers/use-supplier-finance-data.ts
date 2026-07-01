"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { supplierApi } from "@/lib/api/supplier";

export function useSupplierFinanceData() {
  const suppliersQuery = useQuery({
    queryKey: queryKeys.supplier.suppliers(),
    queryFn: supplierApi.getSuppliers,
  });
  const purchasesQuery = useQuery({
    queryKey: queryKeys.supplier.purchases(),
    queryFn: supplierApi.getPurchases,
  });
  const paymentsQuery = useQuery({
    queryKey: queryKeys.supplier.payments(),
    queryFn: supplierApi.getPayments,
  });
  const debtsQuery = useQuery({
    queryKey: queryKeys.supplier.debts(),
    queryFn: supplierApi.getDebts,
  });

  return { suppliersQuery, purchasesQuery, paymentsQuery, debtsQuery };
}
