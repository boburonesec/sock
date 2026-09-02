"use client";

import { useState } from "react";
import { ShieldCheck, UserCheck, Check, X, Users, Eye, Edit3 } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";
import { StatusBadge } from "@/components/data-display/status-badge";
import { cn } from "@/lib/utils";

interface RoleDetails {
  key: string;
  name: string;
  badge: "primary" | "success" | "warning" | "neutral";
  targetUser: string;
  description: string;
  canDo: string[];
  cannotDo: string[];
  modules: {
    production: "view" | "write" | "none";
    warehouse: "view" | "write" | "none";
    sales: "view" | "write" | "none";
    finance: "view" | "write" | "none";
    employees: "view" | "write" | "none";
    machines: "view" | "write" | "none";
    reports: "view" | "none";
    settings: "view" | "write" | "none";
    audit: "view" | "none";
  };
}

const ROLES_DATA: RoleDetails[] = [
  {
    key: "Owner",
    name: "Owner (Korxona egasi)",
    badge: "primary",
    targetUser: "Fabrika ta’sischisi yoki bosh rahbari",
    description: "Tizimning to‘liq egasi. Barcha moliyaviy, operatsion, xodimlar va filial sozlamalari ustidan cheklanmagan boshqaruv huquqiga ega.",
    canDo: [
      "Barcha bo‘limlar va hisobotlarni ko‘rish va tahrirlash",
      "Korxona sozlamalari va yangi filiallar yaratish",
      "Barcha ish stavkalari, mahsulot narxlari va limitlarni tasdiqlash",
      "Tizim audit jurnalini to‘liq kuzatish",
    ],
    cannotDo: [
      "Cheklov yo‘q (barcha ruxsatlarga ega)",
    ],
    modules: {
      production: "write",
      warehouse: "write",
      sales: "write",
      finance: "write",
      employees: "write",
      machines: "write",
      reports: "view",
      settings: "write",
      audit: "view",
    },
  },
  {
    key: "Manager",
    name: "Manager (Boshqaruvchi / Sex boshlig‘i)",
    badge: "success",
    targetUser: "Ishlab chiqarish va korxona operatsion boshqaruvchisi",
    description: "Sexdagi kunlik ishlarni, buyurtmalarni, omborni, xodimlarni va moliyaviy amallarni boshqaradi.",
    canDo: [
      "Ishlab chiqarish jarayonlarini to‘liq boshqarish",
      "Ombor va savdo buyurtmalarini nazorat qilish",
      "Xodimlarni qabul qilish va stavkalarni kiritish",
      "Operatsion xarajatlar va hisobotlarni ko‘rish",
    ],
    cannotDo: [
      "Faqat Korxona egasiga tegishli korxona profili sozlamalarini o‘zgartirish (/settings/company)",
      "Tizim darajasidagi platforma ma’murligini boshqarish",
    ],
    modules: {
      production: "write",
      warehouse: "write",
      sales: "write",
      finance: "write",
      employees: "write",
      machines: "view",
      reports: "view",
      settings: "write",
      audit: "none",
    },
  },
  {
    key: "Shift Receiver",
    name: "Shift Receiver (Smena qabul qiluvchi)",
    badge: "warning",
    targetUser: "Sex hisobchisi yoki smena nazoratchisi",
    description: "Stanokdan chiqqan to‘qimalarni qabul qiladi, bosqichlar orasida mahsulotlarni ko‘chiradi va har bir ishchi bajargan dona ishini tizimga kiritadi.",
    canDo: [
      "Stanokdan chiqqan to‘qimani qabul qilish (1-bosqich Averlog ga kirim)",
      "Bosqichlararo mahsulot ko‘chirish",
      "Ishchilar bajargan ishlarini (dona hisobida) kiritish",
      "Nuqsonlar va yaroqsiz paypoqlarni qayd etish",
    ],
    cannotDo: [
      "Moliya, kassa, xarajatlar yoki oylik hisobini ko‘rish",
      "Sotuv buyurtmalari yoki mijoz qarzlarini ko‘rish",
      "Tizim sozlamalarini o‘zgartirish",
    ],
    modules: {
      production: "write",
      warehouse: "none",
      sales: "none",
      finance: "none",
      employees: "none",
      machines: "view",
      reports: "none",
      settings: "none",
      audit: "none",
    },
  },
  {
    key: "Warehouse Operator",
    name: "Warehouse Operator (Omborchi)",
    badge: "neutral",
    targetUser: "Markaziy ombor mudiri yoki operatori",
    description: "Xomashyo (ip, rezin, qadoq) kirim-chiqimini va tayyor mahsulotlarning zonalardagi harakatini yuritadi.",
    canDo: [
      "Xomashyo kirimi (Receipt) va ishlab chiqarishga chiqim (Issue)",
      "Tayyor mahsulot zaxiralarini va zonalarini boshqarish",
      "Ombor qoldiqlarini to‘g‘rilash (Correction - sabab ko‘rsatgan holda)",
    ],
    cannotDo: [
      "Ishlab chiqarish bosqichlari yoki ishchi hisobini ko‘rish",
      "Moliya, xarajatlar yoki sotuv to‘lovlarini qabul qilish",
      "Mijoz qarzdorligini o‘zgartirish",
    ],
    modules: {
      production: "none",
      warehouse: "write",
      sales: "none",
      finance: "none",
      employees: "none",
      machines: "none",
      reports: "none",
      settings: "none",
      audit: "none",
    },
  },
  {
    key: "Seller",
    name: "Seller (Sotuvchi / Savdo menejeri)",
    badge: "primary",
    targetUser: "Savdo bo‘limi xodimi yoki sotuv agenti",
    description: "Mijozlarni ro‘yxatga oladi, buyurtmalar rasmiylashtiradi, yetkazib berishni tashkil qiladi va mijoz to‘lovlarini qabul qiladi.",
    canDo: [
      "Yangi mijozlar va savdo buyurtmalarini (Orders) yaratish",
      "Tayyor mahsulot ombor qoldig‘ini tekshirish (buyurtma olishdan oldin)",
      "Mijozdan to‘lov qabul qilish va buyurtmaga taqsimlash",
      "Buyurtmani yetkazib berish (Delivery) holatiga o‘tkazish",
    ],
    cannotDo: [
      "Ombordan tovarlarni qo‘lda chiqarish yoki kirim qilish",
      "Ishlab chiqarish, stanoklar yoki xodimlar ma’lumotlarini ko‘rish",
      "Kompaniya xarajatlari yoki payroll hisobini ko‘rish",
    ],
    modules: {
      production: "none",
      warehouse: "view",
      sales: "write",
      finance: "none",
      employees: "none",
      machines: "none",
      reports: "none",
      settings: "none",
      audit: "none",
    },
  },
  {
    key: "Accountant",
    name: "Accountant (Buxgalter / Moliyachi)",
    badge: "success",
    targetUser: "Bosh buxgalter yoki moliyaviy hisobchi",
    description: "Kassa tushumlari, operatsion xarajatlar, avanslar, ish haqi hisob-kitoblari (Payroll) hamda yetkazib beruvchilar hisob-kitobini yuritadi.",
    canDo: [
      "Xarajatlar, avanslar va ta’minotchi to‘lovlarini yuritish",
      "Oylik/haftalik Payroll (ish haqi) hisob-kitoblarini shakllantirish va yopish",
      "Mijozlar to‘lovlari va qarzlarini ko‘rish",
      "Moliyaviy hisobotlar va tushumlar tahlilini ko‘rish",
    ],
    cannotDo: [
      "Ishlab chiqarish smena ma’lumotlarini to‘g‘ridan-to‘g‘ri kiritish",
      "Stanoklar sozlamalari yoki master datani o‘zgartirish",
      "Tizim rollari va ruxsatlarini boshqarish",
    ],
    modules: {
      production: "none",
      warehouse: "view",
      sales: "view",
      finance: "write",
      employees: "none",
      machines: "none",
      reports: "view",
      settings: "none",
      audit: "none",
    },
  },
  {
    key: "Mechanic",
    name: "Mechanic / Mechanic Master (Mexanik)",
    badge: "warning",
    targetUser: "Stanoklar bosh mexanigi va texnik mutaxassislar",
    description: "Stanoklarning texnik holati, smena oldi profilaktika, ta’mirlash vazifalari va paypoq o‘lchov sifatini nazorat qiladi.",
    canDo: [
      "Stanoklarni ko‘rish va ulardagi texnik vazifalarni bajarish",
      "O‘lchov nazorati (Inspection Round) natijalarini kiritish",
      "Ta’mirlash va profilaktika aktlarini belgilash",
    ],
    cannotDo: [
      "Sotuv, moliya, xarajatlar yoki ombor operatsiyalarini ko‘rish",
      "Ishlab chiqarish stage inventarlarini o‘zgartirish",
    ],
    modules: {
      production: "view",
      warehouse: "none",
      sales: "none",
      finance: "none",
      employees: "none",
      machines: "write",
      reports: "none",
      settings: "none",
      audit: "none",
    },
  },
];

export function GuideRoleMatrix() {
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("Owner");
  const currentRole = ROLES_DATA.find((r) => r.key === selectedRoleKey) || ROLES_DATA[0];

  const renderBadge = (status: "view" | "write" | "none") => {
    if (status === "write") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <Edit3 size={11} /> To‘liq
        </span>
      );
    }
    if (status === "view") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-blue-500/15 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
          <Eye size={11} /> Ko‘rish
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        <X size={11} /> Yo‘q
      </span>
    );
  };

  return (
    <PageSection id="roles-matrix">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            4. Rollar va Ruxsatlar Matritsasi (RBAC)
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Paypoq OS korxonadagi xavfsizlik va tartibni ta’minlash uchun har bir xodimga faqat o‘z ishiga kerakli bo‘limlarni ochadi. Quyida barcha rollarning real ruxsatlar xaritasi keltirilgan:
          </p>
        </div>

        {/* Visual Matrix Table */}
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b bg-muted/50 font-semibold text-foreground">
                <th className="p-3">Rol nomi</th>
                <th className="p-3 text-center">Ishlab chiqarish</th>
                <th className="p-3 text-center">Stanoklar</th>
                <th className="p-3 text-center">Ombor</th>
                <th className="p-3 text-center">Sotuv</th>
                <th className="p-3 text-center">Moliya</th>
                <th className="p-3 text-center">Xodimlar</th>
                <th className="p-3 text-center">Hisobotlar</th>
                <th className="p-3 text-center">Sozlamalar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ROLES_DATA.map((role) => (
                <tr
                  key={role.key}
                  onClick={() => setSelectedRoleKey(role.key)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/40",
                    selectedRoleKey === role.key ? "bg-primary/10 font-medium" : "",
                  )}
                >
                  <td className="p-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span>{role.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">{renderBadge(role.modules.production)}</td>
                  <td className="p-3 text-center">{renderBadge(role.modules.machines)}</td>
                  <td className="p-3 text-center">{renderBadge(role.modules.warehouse)}</td>
                  <td className="p-3 text-center">{renderBadge(role.modules.sales)}</td>
                  <td className="p-3 text-center">{renderBadge(role.modules.finance)}</td>
                  <td className="p-3 text-center">{renderBadge(role.modules.employees)}</td>
                  <td className="p-3 text-center">{renderBadge(role.modules.reports)}</td>
                  <td className="p-3 text-center">{renderBadge(role.modules.settings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Role Detail Box */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck size={18} />
              </span>
              <div>
                <h4 className="font-bold text-sm text-foreground">{currentRole.name}</h4>
                <p className="text-xs text-muted-foreground">{currentRole.targetUser}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground italic">
              {currentRole.description}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 pt-1">
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                <Check size={14} /> Qila oladigan amallari:
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {currentRole.canDo.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                <X size={14} /> Cheklovlar va qila olmaydigan amallari:
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {currentRole.cannotDo.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-red-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageSection>
  );
}
