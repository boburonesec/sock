"use client";

import Link from "next/link";
import { Crown, BarChart3, Users, PackageCheck, AlertOctagon, Wallet, ShieldAlert, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";
import { InfoCard } from "@/components/cards/info-card";

const OWNER_CAPABILITIES = [
  {
    icon: BarChart3,
    title: "1. Boshqaruv Paneli va KPI Ko‘rsatkichlari",
    description: "Kunlik, haftalik va oylik sof sotuvlar, to‘langan xarajatlar, kassa qoldiqlari hamda umumiy biznes salomatligini real vaqtda kuzatish.",
    path: "/dashboard/executive",
    bullets: [
      "Joriy oylik tushum va xarajatlar balansi",
      "Kechikkan va to‘lov kutilayotgan buyurtmalar",
      "Eng ko‘p sotilayotgan paypoq modellari va asosiy mijozlar",
    ],
  },
  {
    icon: AlertOctagon,
    title: "2. Ishlab Chiqarish va Tiqilishlar (Bottlenecks) Nazorati",
    description: "Fabrikada qaysi bosqichda (masalan, Dazmolda yoki Sifatda) qancha mahsulot turib qolganini ko‘rib, sex tezligini optimallashtirish.",
    path: "/production",
    bullets: [
      "Bosqich qoldiqlari (Stage Inventory) holati",
      "Nuqsonlar va brak foizini tahlil qilish",
      "Stanoklarning ish unumdorligi va mexanik profilaktika jadvallari",
    ],
  },
  {
    icon: Wallet,
    title: "3. Mijoz va Yetkazib Beruvchi Qarzdorligi",
    description: "Qaysi mijoz qancha qarz bo‘lib qolgani va qaysi ip yetkazib beruvchiga qancha to‘lash kerakligini shaffof ko‘rish.",
    path: "/sales/debts",
    bullets: [
      "Mijoz qarzlari reytingi va to‘lov tarixi",
      "Yetkazib beruvchilar oldidagi jami majburiyatlar",
      "Pul oqimining aniq nazorati (avtomatik hisoblangan qoldiqlar)",
    ],
  },
  {
    icon: Users,
    title: "4. Xodimlar va Ishbay Ish Haqi (Payroll)",
    description: "Har bir ishchining kunlik chiqargan donasiga qarab hisoblangan oyligini tekshirish, bonus/jarimalarni tasdiqlash va payrollni yopish.",
    path: "/finance/payroll",
    bullets: [
      "Ishchilarning real dona bajargan ishlari hisoboti",
      "Tungi smena ustamalari va avanslar hisobi",
      "Oylik ish haqi fondini tasdiqlash va to‘lash",
    ],
  },
  {
    icon: PackageCheck,
    title: "5. Ombor Qoldiqlari va Xomashyo Kamayishi",
    description: "Omborda yetarli ip, rezin yoki etiketka borligini hamda tayyor paypoq zaxiralarini kuzatish.",
    path: "/warehouse",
    bullets: [
      "Xomashyo minimal limitdan (Low stock) tushib ketganda ogohlantirish",
      "Tayyor mahsulot zonalari va partiyalar harakati",
      "Ombor kirim-chiqim audit tarixi",
    ],
  },
  {
    icon: ShieldAlert,
    title: "6. Tizim Xavfsizligi va Korxona Sozlamalari",
    description: "Faqat Owner uchun ochiq bo‘lgan filial yaratish, dastur operatorlari rollari va tizim audit jurnalini to‘liq nazorat qilish.",
    path: "/settings/company",
    bullets: [
      "Korxona ma’lumotlari va filiallar sozlamalari",
      "Audit jurnali orqali kim, qachon va qaysi amalni bajarganini ko‘rish",
      "Xodimlar ish haqi stavkalari va mahsulot narxlarini tasdiqlash",
    ],
  },
];

export function GuideOwnerSection() {
  return (
    <PageSection id="owner-guide">
      <div className="space-y-4">
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Crown size={22} />
            </span>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                3. Korxona Egasi (Owner) sifatida Nimalar Qila Olaman?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Owner roli Paypoq OS tizimida to‘liq vakolatga ega yagona boshqaruvchidir. Barcha strategik va moliyaviy qarorlar shu yerda jamlangan.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {OWNER_CAPABILITIES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex flex-col justify-between rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                      <Icon size={18} className="text-primary shrink-0" />
                      <span>{item.title}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>

                  <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 border border-border/50">
                    <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                      Asosiy imkoniyatlar:
                    </div>
                    {item.bullets.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t">
                  <Link
                    href={item.path}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <span>Modulga o‘tish</span>
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageSection>
  );
}
