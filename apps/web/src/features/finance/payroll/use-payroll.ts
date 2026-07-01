"use client";

import { useQuery } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/finance";
import { queryKeys } from "@/lib/api/query-keys";

export function usePayrollPeriods() {
  return useQuery({
    queryKey: queryKeys.finance.payrollPeriods(),
    queryFn: financeApi.getPayrollPeriods,
  });
}

export function usePayrollPeriodItems(payrollPeriodId: string | null) {
  return useQuery({
    queryKey: queryKeys.finance.payrollPeriodItems(
      payrollPeriodId ?? "__none__",
    ),
    queryFn: () => financeApi.getPayrollPeriodItems(payrollPeriodId ?? ""),
    enabled: Boolean(payrollPeriodId),
  });
}

export const payrollQueryKeys = {
  periods: queryKeys.finance.payrollPeriods(),
};
