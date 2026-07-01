"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import type { Employee } from "@/lib/api/employees";
import { EmployeeDetailsDrawer } from "./components/employee-details-drawer";
import { EmployeeFormDrawer } from "./components/employee-form-drawer";
import { EmployeeTable } from "./components/employee-table";
import {
  useCreateEmployee,
  useEmployees,
  useInactivateEmployee,
  useUpdateEmployee,
} from "./use-employees";

type FormState =
  | { mode: "create"; employee: null }
  | { mode: "edit"; employee: Employee };

export function EmployeesModule() {
  const { data, error, isError, isPending, refetch } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const inactivateEmployee = useInactivateEmployee();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [employeeToInactivate, setEmployeeToInactivate] = useState<Employee | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  if (isPending) {
    return <LoadingState label="Xodimlar yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Xodimlar yuklanmadi"
        description={
          error instanceof Error
            ? error.message
            : "Ma’lumotlarni olishda xatolik yuz berdi."
        }
        action={
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const employees = data?.data ?? [];
  const formError =
    createEmployee.error instanceof Error
      ? createEmployee.error.message
      : updateEmployee.error instanceof Error
        ? updateEmployee.error.message
        : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {feedback ? (
          <p
            role="status"
            className={`rounded-lg border px-3 py-2 text-sm ${
              feedback.tone === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            {feedback.message}
          </p>
        ) : (
          <span />
        )}
        <Button onClick={() => {
          setFeedback(null);
          setFormState({ mode: "create", employee: null });
        }}>
          Xodim qo‘shish
        </Button>
      </div>
      <EmployeeTable employees={employees} onSelect={setSelectedEmployee} />
      <EmployeeDetailsDrawer
        employee={selectedEmployee}
        isInactivating={inactivateEmployee.isPending}
        onOpenChange={(open) => {
          if (!open) setSelectedEmployee(null);
        }}
        onEdit={(employee) => {
          setFeedback(null);
          setFormState({ mode: "edit", employee });
        }}
        onInactivate={(employee) => {
          setFeedback(null);
          setEmployeeToInactivate(employee);
        }}
      />
      <EmployeeFormDrawer
        open={Boolean(formState)}
        mode={formState?.mode ?? "create"}
        employee={formState?.employee ?? null}
        isSubmitting={createEmployee.isPending || updateEmployee.isPending}
        errorMessage={formError}
        onOpenChange={(open) => {
          if (!open) setFormState(null);
        }}
        onSubmit={async ({ name }) => {
          setFeedback(null);
          if (formState?.mode === "edit") {
            await updateEmployee.mutateAsync({
              employeeId: formState.employee.id,
              name,
            });
            setFeedback({ tone: "success", message: "Xodim ma’lumotlari yangilandi." });
          } else {
            await createEmployee.mutateAsync({ name });
            setFeedback({ tone: "success", message: "Yangi xodim yaratildi." });
          }
          setFormState(null);
          setSelectedEmployee(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(employeeToInactivate)}
        onOpenChange={(open) => {
          if (!open) setEmployeeToInactivate(null);
        }}
        title="Xodimni inactive qilish"
        description={
          employeeToInactivate
            ? `${employeeToInactivate.name} inactive qilinadi. Xodim o‘chirilmaydi va tarixiy yozuvlar saqlanadi.`
            : "Xodim inactive qilinadi."
        }
        confirmLabel={inactivateEmployee.isPending ? "Bajarilmoqda..." : "Inactive qilish"}
        destructive
        onConfirm={() => {
          if (!employeeToInactivate) return;
          const employeeName = employeeToInactivate.name;
          inactivateEmployee.mutate(employeeToInactivate.id, {
            onSuccess: () => {
              setFeedback({ tone: "success", message: `${employeeName} inactive qilindi.` });
              setSelectedEmployee(null);
              setEmployeeToInactivate(null);
            },
            onError: (mutationError) => {
              setFeedback({
                tone: "error",
                message:
                  mutationError instanceof Error
                    ? mutationError.message
                    : "Xodimni inactive qilishda xatolik yuz berdi.",
              });
            },
          });
        }}
      />
    </div>
  );
}
