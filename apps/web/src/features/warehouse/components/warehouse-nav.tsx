"use client";

import { ModuleNavigation } from "@/components/navigation/module-navigation";
import { useAuthStore } from "@/stores/auth-store";

export function WarehouseNav() {
  const permissions = useAuthStore((state) => state.permissions);
  const canViewWarehouse = permissions.includes("warehouse.view");

  if (!canViewWarehouse) return null;

  return (
    <ModuleNavigation
      items={[
        { href: "/warehouse", label: "Umumiy" },
        { href: "/warehouse/materials", label: "Materiallar" },
        { href: "/warehouse/movements", label: "Kirim-chiqim" },
        { href: "/warehouse/zones", label: "Zonalar" },
      ]}
    />
  );
}
