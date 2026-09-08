"use client";

import { ModuleNavigation } from "@/components/navigation/module-navigation";
import { useAuthStore } from "@/stores/auth-store";

export function SalesNav() {
  const permissions = useAuthStore((state) => state.permissions);
  const canViewSales = permissions.includes("sales.view");

  if (!canViewSales) return null;

  return (
    <ModuleNavigation
      items={[
        { href: "/sales", label: "Umumiy" },
        { href: "/sales/orders", label: "Buyurtmalar" },
        { href: "/sales/payments", label: "To‘lovlar" },
        { href: "/sales/clients", label: "Mijozlar" },
        { href: "/sales/debts", label: "Qarzdorlik" },
      ]}
    />
  );
}
