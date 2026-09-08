"use client";

import { ModuleNavigation } from "@/components/navigation/module-navigation";
import { useAuthStore } from "@/stores/auth-store";

export function FinanceNav() {
  const permissions = useAuthStore((state) => state.permissions);
  const canViewFinance = permissions.includes("finance.view");

  if (!canViewFinance) return null;

  return (
    <ModuleNavigation
      items={[
        { href: "/finance", label: "Umumiy" },
        { href: "/finance/expenses", label: "Xarajatlar" },
        { href: "/finance/advances", label: "Avanslar" },
        { href: "/finance/payroll", label: "Ish haqi" },
        { href: "/finance/suppliers", label: "Yetkazib beruvchilar" },
      ]}
    />
  );
}
