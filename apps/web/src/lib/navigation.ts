import type { LucideIcon } from "lucide-react";
import { BarChart3, Boxes, ClipboardList, Factory, History, LayoutDashboard, Package, Settings, Users, WalletCards } from "lucide-react";

export interface PageDefinition {
  title: string;
  description: string;
}

export interface NavigationItem extends PageDefinition {
  href: string;
  icon: LucideIcon;
  section: "monitoring" | "work" | "system";
  ownerOnly?: boolean;
  requiredPermissions?: string[];
}

export const navigationItems: NavigationItem[] = [
  { href: "/dashboard/executive", title: "Boshqaruv paneli", description: "Umumiy biznes ko‘rinishi", icon: LayoutDashboard, section: "monitoring", requiredPermissions: ["dashboard.view"] },
  { href: "/dashboard/operations", title: "Operatsiyalar", description: "Korxona operatsiyalari", icon: Factory, section: "monitoring", requiredPermissions: ["dashboard.view"] },
  { href: "/reports", title: "Hisobotlar", description: "Hisobotlar moduli", icon: BarChart3, section: "monitoring", requiredPermissions: ["reports.view"] },
  { href: "/audit", title: "Audit jurnali", description: "Tizim amallari tarixi", icon: History, section: "monitoring", requiredPermissions: ["audit.view"] },
  { href: "/production", title: "Ishlab chiqarish", description: "Ishlab chiqarish moduli", icon: Boxes, section: "work", requiredPermissions: ["production.view"] },
  { href: "/warehouse", title: "Ombor", description: "Ombor moduli", icon: Package, section: "work", requiredPermissions: ["warehouse.view"] },
  { href: "/sales", title: "Sotuvlar", description: "Sotuvlar moduli", icon: ClipboardList, section: "work", requiredPermissions: ["sales.view"] },
  { href: "/finance", title: "Moliya", description: "Moliya moduli", icon: WalletCards, section: "work", requiredPermissions: ["finance.view"] },
  { href: "/employees", title: "Xodimlar", description: "Ishbay ishchilar (dasturga kirmaydi)", icon: Users, section: "work", requiredPermissions: ["employees.view"] },
  { href: "/settings", title: "Sozlamalar", description: "Tizim sozlamalari", icon: Settings, section: "system", requiredPermissions: ["settings.view"] },
];

export const pageDefinitions: Record<string, PageDefinition> = {
  "/": { title: "Paypoq OS", description: "Ishlab chiqarish boshqaruvi" },
  "/dashboard/executive": { title: "Boshqaruv paneli", description: "Ega va menejer uchun umumiy biznes ko‘rinishi" },
  "/dashboard/operations": { title: "Operatsiyalar paneli", description: "Korxona operatsion ko‘rinishi" },
  "/dashboard/finance": { title: "Moliya paneli", description: "Moliya bo‘yicha umumiy ko‘rinish" },
  "/dashboard/sales": { title: "Sotuvlar paneli", description: "Sotuvlar bo‘yicha umumiy ko‘rinish" },
  "/production": { title: "Ishlab chiqarish", description: "Ishlab chiqarish moduli" },
  "/production/stages": { title: "Bosqichlar", description: "Ishlab chiqarish bosqichlari" },
  "/production/activities": { title: "Faoliyatlar", description: "Xodim faoliyatlari" },
  "/production/defects": { title: "Nuqsonlar", description: "Nuqsonlar moduli" },
  "/warehouse": { title: "Ombor", description: "Ombor moduli" },
  "/warehouse/materials": { title: "Materiallar", description: "Materiallar moduli" },
  "/warehouse/movements": { title: "Ombor harakatlari", description: "Ombor harakatlari" },
  "/warehouse/zones": { title: "Ombor zonalari", description: "Ombor zonalari" },
  "/sales": { title: "Sotuvlar", description: "Sotuvlar moduli" },
  "/sales/clients": { title: "Mijozlar", description: "Mijozlar moduli" },
  "/sales/orders": { title: "Buyurtmalar", description: "Buyurtmalar moduli" },
  "/sales/payments": { title: "To‘lovlar", description: "To‘lovlar moduli" },
  "/sales/debts": { title: "Mijoz qarzdorligi", description: "Mijoz qarzdorligi" },
  "/finance": { title: "Moliya", description: "Moliya moduli" },
  "/finance/expenses": { title: "Xarajatlar", description: "Xarajatlar moduli" },
  "/finance/advances": { title: "Avanslar", description: "Avanslar moduli" },
  "/finance/payroll": { title: "Ish haqi", description: "Xodimlar ish haqi" },
  "/finance/suppliers": { title: "Yetkazib beruvchilar", description: "Yetkazib beruvchilar moduli" },
  "/employees": { title: "Xodimlar", description: "Ishbay ishchilar — faollik va ish haqi" },
  "/employees/bonuses": { title: "Bonuslar", description: "Bonuslar moduli" },
  "/employees/penalties": { title: "Jarimalar", description: "Jarimalar moduli" },
  "/profile": { title: "Profil", description: "Operator akkaunti va ruxsatlar" },
  "/reports": { title: "Hisobotlar", description: "Hisobotlar moduli" },
  "/reports/production": { title: "Ishlab chiqarish hisoboti", description: "Hisobotlar moduli" },
  "/reports/employees": { title: "Xodimlar hisoboti", description: "Ishbay ishchilar hisoboti" },
  "/reports/sales": { title: "Sotuvlar hisoboti", description: "Hisobotlar moduli" },
  "/reports/finance": { title: "Moliya hisoboti", description: "Hisobotlar moduli" },
  "/reports/warehouse": { title: "Ombor hisoboti", description: "Hisobotlar moduli" },
  "/settings": { title: "Sozlamalar", description: "Asosiy ma’lumotlar va tizim sozlamalari" },
  "/settings/company": { title: "Korxona sozlamalari", description: "Filiallar va dastur operatorlari" },
  "/settings/products": { title: "Mahsulotlar", description: "Sozlamalar" },
  "/settings/product-models": { title: "Mahsulot modellari", description: "Sozlamalar" },
  "/settings/colors": { title: "Ranglar", description: "Sozlamalar" },
  "/settings/materials": { title: "Materiallar", description: "Sozlamalar" },
  "/settings/seasons": { title: "Mavsumlar", description: "Sozlamalar" },
  "/settings/stages": { title: "Ishlab chiqarish bosqichlari", description: "Sozlamalar" },
  "/settings/salary-rates": { title: "Ish haqi stavkalari", description: "Sozlamalar" },
  "/settings/expense-categories": { title: "Xarajat kategoriyalari", description: "Sozlamalar" },
  "/settings/zones": { title: "Ombor zonalari", description: "Sozlamalar" },
  "/settings/thresholds": { title: "Limit sozlamalari", description: "Sozlamalar" },
  "/settings/roles": { title: "Rollar", description: "Sozlamalar" },
  "/settings/permissions": { title: "Ruxsatlar", description: "Sozlamalar" },
  "/notifications": { title: "Bildirishnomalar", description: "Tizim bildirishnomalari" },
  "/audit": { title: "Audit jurnali", description: "Tizim amallari tarixi" },
};

export function getPageDefinition(pathname: string): PageDefinition {
  if (/^\/sales\/clients\/[^/]+$/.test(pathname)) return { title: "Mijoz tafsilotlari", description: "Mijoz ma’lumotlari, buyurtmalar va to‘lovlar" };
  if (/^\/sales\/orders\/[^/]+$/.test(pathname)) return { title: "Buyurtma tafsilotlari", description: "Buyurtma mahsulotlari va to‘lovlari" };
  if (/^\/finance\/payroll\/[^/]+$/.test(pathname)) return { title: "Ish haqi tafsilotlari", description: "Xodimlar bo‘yicha ish haqi davri" };
  if (/^\/employees\/[^/]+$/.test(pathname)) return { title: "Xodim tafsilotlari", description: "Xodim faoliyati va hisob-kitoblari" };
  return pageDefinitions[pathname] ?? { title: "Sahifa", description: "Paypoq OS moduli" };
}
