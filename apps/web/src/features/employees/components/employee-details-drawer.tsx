"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/overlays/drawer";
import { InfoCard } from "@/components/cards/info-card";
import {
  employeeWorkProfileLabels,
  type Employee,
} from "@/lib/api/employees";
import { telegramApi, type TelegramLinkTokenCreated } from "@/lib/api/telegram";
import { TelegramLinkCodeCard } from "@/features/telegram/telegram-link-code-card";
import { EmployeePayrollTab } from "./employee-payroll-tab";

type EmployeeTab = "activities" | "payroll" | "bonuses" | "penalties" | "advances";
const tabs: { id: EmployeeTab; label: string }[] = [
  { id: "activities", label: "Faollik" }, { id: "payroll", label: "Ish haqi" }, { id: "bonuses", label: "Bonuslar" }, { id: "penalties", label: "Jarimalar" }, { id: "advances", label: "Avanslar" },
];

interface EmployeeDetailsDrawerProps {
  employee: Employee | null;
  isInactivating?: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (employee: Employee) => void;
  onInactivate: (employee: Employee) => void;
}

export function EmployeeDetailsDrawer({
  employee,
  isInactivating = false,
  onOpenChange,
  onEdit,
  onInactivate,
}: EmployeeDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<EmployeeTab>("activities");
  const [linkToken, setLinkToken] = useState<TelegramLinkTokenCreated | null>(null);
  const createTelegramCode = useMutation({
    mutationFn: (employeeId: string) =>
      telegramApi.createEmployeeLinkToken(employeeId),
    onSuccess: (response) => {
      setLinkToken(response.data);
    },
  });

  useEffect(() => {
    setLinkToken(null);
    createTelegramCode.reset();
    // Reset when switching selected employee so raw codes are not carried
    // between drawer sessions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id]);

  if (!employee) return null;

  return <Drawer open={Boolean(employee)} onOpenChange={onOpenChange} title={employee.name} description={`Holati: ${employee.status === "ACTIVE" ? "Faol" : "Nofaol"}`} className="max-w-5xl">
    <div className="space-y-5">
      <InfoCard title="Lavozim">
        <p className="text-sm text-muted-foreground">
          {employeeWorkProfileLabels[employee.workProfile]}
        </p>
      </InfoCard>
      <InfoCard title="Ish smenasi">
        <p className="text-sm text-muted-foreground">
          {employee.workShift
            ? `${employee.workShift.name} · ${String(Math.floor(employee.workShift.startMinute / 60)).padStart(2, "0")}:${String(employee.workShift.startMinute % 60).padStart(2, "0")}–${String(Math.floor(employee.workShift.endMinute / 60)).padStart(2, "0")}:${String(employee.workShift.endMinute % 60).padStart(2, "0")}`
            : "Smena tanlanmagan. Faollik yozishdan oldin tahrirlang."}
        </p>
      </InfoCard>
      <div className="flex flex-wrap gap-2"><Button variant="outline" className="h-9" onClick={() => onEdit(employee)}>Tahrirlash</Button><Button variant="outline" className="h-9 border-rose-500/40 text-rose-300 hover:bg-rose-500/10" disabled={isInactivating} onClick={() => onInactivate(employee)}>{isInactivating ? "Nofaol qilinmoqda..." : "Nofaol qilish"}</Button><Button disabled variant="outline" className="h-9">Bonus qo‘shish</Button><Button disabled variant="outline" className="h-9">Jarima qo‘shish</Button></div>
      <TelegramLinkCodeCard
        targetName={employee.name}
        linkToken={linkToken}
        isGenerating={createTelegramCode.isPending}
        error={createTelegramCode.error}
        onGenerate={() => {
          setLinkToken(null);
          createTelegramCode.mutate(employee.id);
        }}
      />
      <div className="flex gap-1 overflow-x-auto border-b">{tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{tab.label}</button>)}</div>
      {activeTab === "activities" && <UnavailableState title="Faollik ma’lumotlari" />}
      {activeTab === "payroll" && <EmployeePayrollTab employee={employee} />}
      {["bonuses", "penalties", "advances"].includes(activeTab) && <UnavailableState title="Qo‘shimcha ma’lumotlar" />}
    </div>
  </Drawer>;
}

function UnavailableState({ title }: { title: string }) {
  return (
    <InfoCard title={title}>
      <p className="text-sm text-muted-foreground">
        Bu bo‘lim uchun ma’lumotlar keyingi yangilanishlarda to‘ldiriladi.
      </p>
    </InfoCard>
  );
}
