"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  employeeWorkProfileLabels,
  type Employee,
  type EmployeeWorkProfile,
} from "@/lib/api/employees";

const employeeFormSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Ism kiritilishi shart.")),
  stageIds: z.array(z.string()),
  workProfile: z.enum(["STAGE_WORKER", "MACHINE_OPERATOR", "MECHANIC", "MECHANIC_MASTER", "STAFF"]),
  compensationType: z.enum(["PIECE_RATE", "SALARIED"]),
  workShiftId: z.string().optional(),
  email: z.string().trim().optional(),
  password: z.string().optional(),
  roleName: z.string().optional(),
  monthlySalaryAmount: z.coerce.number().min(0).optional(),
}).superRefine((value, ctx) => {
  if (value.workProfile === "STAGE_WORKER" && value.stageIds.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["stageIds"], message: "Kamida bitta bosqich tanlang." });
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface EmployeeFormDrawerProps {
  mode: "create" | "edit";
  employee: Employee | null;
  open: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  stageOptions: Array<{ id: string; name: string; sortOrder: number }>;
  shiftOptions: Array<{
    id: string;
    code: "DAY" | "NIGHT";
    name: string;
    startTime: string;
    endTime: string;
    premiumPerPiece: string;
  }>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
}

export function EmployeeFormDrawer({
  mode,
  employee,
  open,
  isSubmitting,
  errorMessage,
  stageOptions,
  shiftOptions,
  onOpenChange,
  onSubmit,
}: EmployeeFormDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: "",
      stageIds: [],
      workProfile: "STAGE_WORKER",
      compensationType: "PIECE_RATE",
      workShiftId: "",
      email: "",
      password: "",
      roleName: "",
    },
  });

  const selectedStageIds = watch("stageIds") ?? [];
  const workProfile = watch("workProfile");
  const compensationType = watch("compensationType");
  const needsAccount = ["MECHANIC", "MECHANIC_MASTER", "STAFF"].includes(workProfile);

  useEffect(() => {
    const salaried = workProfile === "MECHANIC_MASTER" || workProfile === "STAFF";
    setValue("compensationType", salaried ? "SALARIED" : "PIECE_RATE", {
      shouldValidate: true,
    });

    if (workProfile !== "STAGE_WORKER") {
      setValue("stageIds", [], { shouldValidate: true });
    }

    if (!employee?.account) {
      if (workProfile === "MECHANIC") setValue("roleName", "Mechanic");
      else if (workProfile === "MECHANIC_MASTER") setValue("roleName", "Mechanic Master");
      else setValue("roleName", "");
    }

    if (!needsAccount) {
      setValue("email", "");
      setValue("password", "");
    }
  }, [employee?.account, needsAccount, setValue, workProfile]);

  useEffect(() => {
    reset({
      name: mode === "edit" ? employee?.name ?? "" : "",
      stageIds:
        mode === "edit" ? (employee?.stages ?? []).map((stage) => stage.id) : [],
      workProfile: mode === "edit" ? employee?.workProfile ?? "STAGE_WORKER" : "STAGE_WORKER",
      compensationType: mode === "edit" ? employee?.compensationType ?? "PIECE_RATE" : "PIECE_RATE",
      workShiftId: mode === "edit" ? employee?.workShift?.id ?? "" : "",
      email: "",
      password: "",
      roleName: mode === "edit" ? employee?.account?.roleNames[0] ?? "" : "",
      monthlySalaryAmount: mode === "edit" && employee?.salaryAgreement ? Number(employee.salaryAgreement.monthlyAmount) : undefined,
    });
  }, [employee, mode, open, reset]);

  const title = mode === "create" ? "Xodim qo‘shish" : "Xodimni tahrirlash";
  const description =
    mode === "create"
      ? "Ism, lavozim, smena va kerak bo‘lsa ish bosqichlarini belgilang."
      : "Xodimning lavozimi, smenasi yoki ish bosqichlarini yangilang.";

  function toggleStage(stageId: string) {
    const next = selectedStageIds.includes(stageId)
      ? selectedStageIds.filter((id) => id !== stageId)
      : [...selectedStageIds, stageId];
    setValue("stageIds", next, { shouldDirty: true });
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormField
          htmlFor="employeeName"
          label="Ism"
          error={errors.name?.message}
          required
        >
          <Input
            id="employeeName"
            autoComplete="off"
            placeholder="Masalan: Ali Averlogchi"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </FormField>

        <FormField
          htmlFor="employeeWorkProfile"
          label="Ish profili"
          error={errors.workProfile?.message}
          required
        >
          <Select
            id="employeeWorkProfile"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.workProfile)}
            {...register("workProfile")}
          >
            {(Object.entries(employeeWorkProfileLabels) as Array<
              [EmployeeWorkProfile, string]
            >).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField htmlFor="employeeCompensation" label="Haq turi" error={errors.compensationType?.message} required>
          <Select id="employeeCompensation" disabled {...register("compensationType")}>
            <option value="PIECE_RATE">Ishbay</option>
            <option value="SALARIED">Oylik</option>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Haq turi ish profiliga ko‘ra avtomatik belgilanadi.
          </p>
        </FormField>

        <FormField
          htmlFor="employeeWorkShiftId"
          label="Ish smenasi"
          error={errors.workShiftId?.message}
        >
          <Select
            id="employeeWorkShiftId"
            disabled={isSubmitting || shiftOptions.length === 0}
            aria-invalid={Boolean(errors.workShiftId)}
            {...register("workShiftId")}
          >
            <option value="">Smena biriktirilmagan</option>
            {shiftOptions.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name} · {shift.startTime}–{shift.endTime}
                {shift.code === "NIGHT" ? ` · +${shift.premiumPerPiece} so‘m/dona` : ""}
              </option>
            ))}
          </Select>
        </FormField>

        {workProfile === "STAGE_WORKER" && <div className="space-y-2">
          <p className="text-sm font-medium">
            Qaysi ishda ishlaydi? <span className="text-muted-foreground">(bir yoki bir nechta)</span>
          </p>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
            {stageOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Bosqichlar topilmadi. Avval sozlamalarda bosqichlar bo‘lishi kerak.
              </p>
            ) : (
              stageOptions.map((stage) => {
                const checked = selectedStageIds.includes(stage.id);
                return (
                  <label
                    key={stage.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      disabled={isSubmitting}
                      onChange={() => toggleStage(stage.id)}
                    />
                    <span className="text-sm">
                      {stage.sortOrder}. {stage.name}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          {errors.stageIds?.message && <p className="text-sm text-destructive">{errors.stageIds.message}</p>}
        </div>}

        {needsAccount && !employee?.account && (
          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">Dastur accounti</p>
            <FormField htmlFor="employeeEmail" label="Email" error={errors.email?.message}><Input id="employeeEmail" type="email" {...register("email")} /></FormField>
            <FormField htmlFor="employeePassword" label="Vaqtinchalik parol" error={errors.password?.message}><Input id="employeePassword" type="password" {...register("password")} /></FormField>
            <FormField htmlFor="employeeRole" label="Dastur roli" error={errors.roleName?.message}>
              <Select id="employeeRole" {...register("roleName")}>
                <option value="">Rolni tanlang</option>
                {workProfile === "MECHANIC" && <option value="Mechanic">Mechanic</option>}
                {workProfile === "MECHANIC_MASTER" && <option value="Mechanic Master">Mechanic Master</option>}
                {workProfile === "STAFF" && ["Manager", "Accountant", "Seller", "Warehouse Operator", "Shift Receiver"].map((role) => <option key={role} value={role}>{role}</option>)}
              </Select>
            </FormField>
          </div>
        )}

        {compensationType === "SALARIED" && (
          <FormField htmlFor="monthlySalary" label="Oylik summa" error={errors.monthlySalaryAmount?.message} required={mode === "create"}>
            <Input id="monthlySalary" type="number" min={0} step="0.01" {...register("monthlySalaryAmount")} />
          </FormField>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            {errorMessage}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? "Saqlanmoqda..."
            : mode === "create"
              ? "Xodim yaratish"
              : "O‘zgarishni saqlash"}
        </Button>
      </form>
    </Drawer>
  );
}
