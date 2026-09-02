"use client";

import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  title: string;
  badge?: string;
  icon?: string;
}

export const GUIDE_SECTIONS: TocItem[] = [
  { id: "about", title: "1. Paypoq OS nima?", badge: "Asosiy" },
  { id: "getting-started", title: "2. Qayerdan boshlash kerak?", badge: "Ketma-ketlik" },
  { id: "owner-guide", title: "3. Korxona egasi (Owner) qo‘llanmasi", badge: "Strategik" },
  { id: "roles-matrix", title: "4. Rollar va Ruxsatlar", badge: "RBAC" },
  { id: "default-data", title: "5. Standart va Sozlanadigan ma’lumotlar", badge: "Sozlamalar" },
  { id: "production-flow", title: "6. Ishlab chiqarish va Stage Inventory", badge: "Jarayon" },
  { id: "warehouse-flow", title: "7. Ombor va Zonalarda tovar harakati", badge: "Ombor" },
  { id: "sales-debt-flow", title: "8. Sotuv, Yetkazib berish va Mijoz qarzi", badge: "Savdo" },
  { id: "supplier-flow", title: "9. Xomashyo xaridi va Ta’minotchi qarzi", badge: "Ta’minot" },
  { id: "payroll-flow", title: "10. Ish haqi (Payroll) va Ishbay hisob", badge: "Moliya" },
  { id: "test-walkthrough", title: "11. 10 qadamli Sinov Yo‘riqnomasi", badge: "Amaliyot" },
];

interface GuideTocProps {
  activeSection: string;
  onSelectSection: (id: string) => void;
}

export function GuideToc({ activeSection, onSelectSection }: GuideTocProps) {
  return (
    <nav aria-label="Qo‘llanma mundarijasi" className="sticky top-16 z-10 -mx-3 mb-8 bg-background/95 px-3 py-3 backdrop-blur border-b sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
          Mundarija:
        </span>
        {GUIDE_SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelectSection(section.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground",
              )}
            >
              <span>{section.title}</span>
              {section.badge && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.2 text-[10px] font-semibold",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {section.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
