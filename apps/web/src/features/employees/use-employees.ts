"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "@/lib/api/employees";
import { queryKeys } from "@/lib/api/query-keys";

export function useEmployees() {
  return useQuery({
    queryKey: queryKeys.employees.list(),
    queryFn: employeesApi.getEmployees,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: employeesApi.createEmployee,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.employees.list() });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      name,
    }: {
      employeeId: string;
      name: string;
    }) => employeesApi.updateEmployee(employeeId, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.employees.list() });
    },
  });
}

export function useInactivateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: employeesApi.inactivateEmployee,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.employees.list() });
    },
  });
}
