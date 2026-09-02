"use client";

import Link from "next/link";
import { Sliders, Database, Layers, Package, Tag, Clock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";

const DEFAULT_CONFIGS = [
  {
    title: "1. Boshlang‘ich Ombor va Zonalar",
    category: "Ombor arxitekturasi",
    defaultValues: [
      "Standart ombor: «Asosiy ombor»",
      "5 ta standart zona: Tayyor mahsulot (Finished Products), Xom ashyo (Raw Materials), Qadoqlash (Packaging), Etiketka (Labels), Nuqsonlar (Defects)",
    ],
    canEdit: "Ha, yangi zonalar qo‘shish mumkin (/settings/zones). Standart zona nomlari tizim integratsiyasi uchun tavsiya etiladi.",
    impact: "Xomashyo va tayyor paypoqlar aynan shu zonalar kesimida saqlanadi va hisoblanadi.",
    href: "/settings/zones",
  },
  {
    title: "2. 10 ta Standart Ishlab Chiqarish Bosqichi",
    category: "Sex bosqichlari zanjiri",
    defaultValues: [
      "1. Averlog  2. Dazmol  3. Sifat  4. Kiydirish  5. Par Dazmol  6. Parlash  7. Bezak  8. Etiketka  9. Qadoqlash  10. Ombor",
    ],
    canEdit: "Bosqichlar ketma-ketligini ko‘rish mumkin (/settings/stages). Yangi fabrika ochilganda ushbu 10 bosqich avtomatik yuklanadi.",
    impact: "Qadoqlashdan Ombor bosqichiga ko‘chirish avtomatik ravishda tayyor mahsulotni asosiy ombor qoldig‘iga kirim qiladi.",
    href: "/settings/stages",
  },
  {
    title: "3. Standart Xarajat Kategoriyalari",
    category: "Moliyaviy tasnif",
    defaultValues: [
      "Transport, Materiallar, Qadoqlash, Uskuna ta’miri, Boshqa",
    ],
    canEdit: "Ha, korxona o‘ziga xos yangi xarajat turlarini qo‘shishi mumkin (/settings/expense-categories).",
    impact: "Buxgalter kiritgan barcha xarajatlar ushbu kategoriyalar bo‘yicha hisobotlarda guruhlanadi.",
    href: "/settings/expense-categories",
  },
  {
    title: "4. Ish Smenalari va Tungi Ustama",
    category: "Ish rejimi",
    defaultValues: [
      "DAY (Kunduzgi smena) va NIGHT (Kechki smena + qo‘shimcha tungi dona ustamasi)",
    ],
    canEdit: "Smena boshlanish/tugash vaqtlari va tungi ustama miqdorini tahrirlash mumkin (/settings/shifts).",
    impact: "Kechki smenada ishlagan ishchilarning bajargan ishlariga avtomatik ravishda tungi bonus qo‘shiladi.",
    href: "/settings/shifts",
  },
  {
    title: "5. Ishbay Ish Haqi Stavkalari",
    category: "Dona stavkalari",
    defaultValues: [
      "Har bir bosqich (Averlog, Dazmol, Tikuv...) va mahsulot modeli uchun 1 dona to‘qilgan/tikilgan paypoq narxi",
    ],
    canEdit: "Ha, to‘liq sozlanadi (/settings/salary-rates). Yangi mahsulot yoki bosqich uchun stavka kiritiladi.",
    impact: "Shift Receiver ishchi chiqargan donani kiritganda, oylik avtomatik ushbu stavka bo‘yicha hisoblanadi. Tarixiy yozuvlar saqlanadi.",
    href: "/settings/salary-rates",
  },
  {
    title: "6. Ranglar, Materiallar va Mavsumlar",
    category: "Mahsulot atributlari",
    defaultValues: [
      "Ranglar katalogi (Oq, Qora, Kulrang...), Materiallar (Paxta, Bambuk, Elastan...), Mavsumlar (Qish, Yoz, Demi-sezon)",
    ],
    canEdit: "To‘liq erkin qo‘shish va tahrirlash mumkin (/settings/colors, /settings/materials, /settings/seasons).",
    impact: "Mahsulot variantlari va ombor hisobi shu atributlar asosida shakllanadi.",
    href: "/settings/products",
  },
];

export function GuideDefaultData() {
  return (
    <PageSection id="default-data">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            5. Boshlang‘ich (Default) va Sozlanadigan Ma’lumotlar
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Yangi korxona ochilganda Paypoq OS tayyor ishlab chiqarish shablonlarini avtomatik taqdim etadi. Ushbu ma’lumotlar korxona ehtiyojiga qarab o‘zgartirilishi mumkin:
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DEFAULT_CONFIGS.map((item) => (
            <div
              key={item.title}
              className="flex flex-col justify-between rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold text-xs text-primary uppercase tracking-wider">
                    {item.category}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Konfiguratsiya
                  </span>
                </div>

                <h4 className="font-bold text-sm text-foreground">{item.title}</h4>

                <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground font-medium space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Standart qiymatlar:</div>
                  {item.defaultValues.map((val, idx) => (
                    <div key={idx} className="text-xs text-foreground font-normal">{val}</div>
                  ))}
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-foreground">O‘zgartirish: </span>
                    <span className="text-muted-foreground">{item.canEdit}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Ta’siri: </span>
                    <span className="text-muted-foreground">{item.impact}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t">
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Sozlamani ochish</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageSection>
  );
}
