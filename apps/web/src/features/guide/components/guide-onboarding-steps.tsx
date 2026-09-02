"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle, Cog, Play, Users, Package, ShoppingCart, DollarSign, BarChart3, Wrench } from "lucide-react";
import { InfoCard } from "@/components/cards/info-card";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";

const ONBOARDING_STEPS = [
  {
    step: 1,
    title: "Asosiy ma’lumotlar sozlamalari",
    href: "/settings",
    icon: Cog,
    description: "Fabrikadagi mahsulot ranglari, iplar/materiallar, mavsumlar, mahsulot modellari va sotuv narxlarini kiriting.",
    keyAction: "Ranglar, materiallar, mahsulotlar va ularning narxlarini belgilash.",
    tag: "Boshlang‘ich sozlash",
  },
  {
    step: 2,
    title: "Stanoklar va O‘lchov sifati",
    href: "/machines",
    icon: Wrench,
    description: "Mavjud paypoq to‘qish stanoklarini ro‘yxatdan o‘tkazing, ularga mas’ul mexanikni biriktiring va sifat o‘lchov talablarini sozlang.",
    keyAction: "Stanoklar va mexanik profilaktika jadvallarini tuzish.",
    tag: "Uskunalar",
  },
  {
    step: 3,
    title: "Xodimlar va Ishbay stavkalar",
    href: "/employees",
    icon: Users,
    description: "Ishchilarni (Tikuvchi, Dazmolchi, Operator, Mexanik, Sotuvchi, Buxgalter) kiritib, har bir bosqich uchun dona hisobidagi ishbay stavkalarni belgilang.",
    keyAction: "Ishchilarni ro‘yxatga olish va /settings/salary-rates orqali ish stavkalarini kiritish.",
    tag: "Xodimlar & Stavka",
  },
  {
    step: 4,
    title: "Ombor va Kontragentlar",
    href: "/warehouse",
    icon: Package,
    description: "Mijozlar va Yetkazib beruvchilarni ro‘yxatga oling. Omborda dastlabki ip/xomashyo qoldiqlarini kirim qiling.",
    keyAction: "Mijozlar, yetkazib beruvchilar va xomashyo kirimini kiritish.",
    tag: "Xomashyo & Ombor",
  },
  {
    step: 5,
    title: "Jonli ishlab chiqarish jarayoni",
    href: "/production",
    icon: Play,
    description: "Stanokda to‘qish partiyasini boshlang, chiqqan to‘qimani qabul qiling va bosqichlar (Averlog -> Dazmol -> ...) bo‘ylab ko‘chiring.",
    keyAction: "Smena qabul qiluvchi orqali ishchilar bajargan ishini qayd etish.",
    tag: "Ishlab chiqarish",
  },
  {
    step: 6,
    title: "Sotuv va Yetkazib berish",
    href: "/sales",
    icon: ShoppingCart,
    description: "Mijozdan buyurtma oling, tayyor mahsulotni yetkazib bering va mijoz to‘lovini qabul qilib, qarz qoldig‘ini kuzating.",
    keyAction: "Buyurtma ochish, yetkazish va to‘lovlarni buyurtmaga taqsimlash.",
    tag: "Sotuv & Qarz",
  },
  {
    step: 7,
    title: "Xarajatlar, Ta’minot va Ish haqi",
    href: "/finance",
    icon: DollarSign,
    description: "Operatsion xarajatlarni tasdiqlang, xomashyo xaridlarini to‘lang va oy oxirida ishchilarning ishbay oyligini (Payroll) hisoblang.",
    keyAction: "Payroll davrini ochish, to‘lovlarni kiritish va davrni yopish.",
    tag: "Moliya & Payroll",
  },
  {
    step: 8,
    title: "Boshqaruv va Monitoring",
    href: "/dashboard/executive",
    icon: BarChart3,
    description: "Boshqaruv panelida korxonaning umumiy sof daromadi, oylik tushumlari, mijozlar va ta’minotchilar qarzi hamda unumdorlikni kuzating.",
    keyAction: "KPI va hisobotlarni tahlil qilish.",
    tag: "Ega nazorati",
  },
];

export function GuideOnboardingSteps() {
  return (
    <PageSection id="getting-started">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            2. Tizimni Qayerdan Boshlash Kerak? (Tavsiya etilgan amaliy ketma-ketlik)
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Yangi fabrika boshlaganda yoki tizimni birinchi marta sinovdan o‘tkazayotganda quyidagi mantiqiy tartibda harakatlanish tavsiya etiladi:
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ONBOARDING_STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="group relative flex flex-col justify-between rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      0{item.step}
                    </span>
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {item.tag}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                    <Icon size={16} className="text-primary shrink-0" />
                    <span className="line-clamp-1">{item.title}</span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t">
                  <div className="text-[11px] text-muted-foreground mb-2">
                    <strong className="text-foreground">Amal:</strong> {item.keyAction}
                  </div>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <span>Sahifaga o‘tish</span>
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
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
