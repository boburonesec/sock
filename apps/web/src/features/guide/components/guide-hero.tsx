"use client";

import { CheckCircle2, Factory, Layers, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { InfoCard } from "@/components/cards/info-card";
import { PageSection } from "@/components/layout/page-section";

export function GuideHero() {
  return (
    <PageSection id="about">
      <div className="rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles size={14} />
              <span>Biznes uchun qisqa va aniq qo‘llanma</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Paypoq OS — Paypoq Fabrikasi Operatsion Boshqaruv Tizimi
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Paypoq OS — bu umumiy yoki murakkab buxgalteriya dasturi emas. Bu maxsus <strong className="text-foreground">paypoq ishlab chiqarish korxonalari</strong>ning real ehtiyojlariga moslashtirilgan, stanokdan boshlab to tayyor mahsulot sotuvi, mijoz qarzi va ishchilarning ishbay oyliklarigacha bo‘lgan barcha jarayonlarni shaffof va oson boshqaradigan zamonaviy tizimdir.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0 lg:w-72">
            <div className="rounded-xl border bg-card/60 p-3.5 backdrop-blur">
              <div className="text-xl font-bold text-primary">100%</div>
              <div className="text-xs text-muted-foreground mt-0.5">Shaffof bosqich inventari</div>
            </div>
            <div className="rounded-xl border bg-card/60 p-3.5 backdrop-blur">
              <div className="text-xl font-bold text-emerald-500">Avtomatik</div>
              <div className="text-xs text-muted-foreground mt-0.5">Qarz va ish haqi hisobi</div>
            </div>
            <div className="rounded-xl border bg-card/60 p-3.5 backdrop-blur">
              <div className="text-xl font-bold text-blue-500">10 ta</div>
              <div className="text-xs text-muted-foreground mt-0.5">Standart ishlab chiqarish bosqichi</div>
            </div>
            <div className="rounded-xl border bg-card/60 p-3.5 backdrop-blur">
              <div className="text-xl font-bold text-amber-500">0 manfiy</div>
              <div className="text-xs text-muted-foreground mt-0.5">Qat’iy ombor intizomi</div>
            </div>
          </div>
        </div>

        {/* 3 Core Pillars */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Factory size={18} />
              <span>Qanday muammoni hal qiladi?</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Fabrikada xomashyo qayerga ketdi, qaysi bosqichda qancha mahsulot tiqilib qoldi (bottleneck), ishchilar qancha dona tikdi va omborda aynan qaysi rang/modeldan qancha qoldi — barchasini bitta ekranda ko‘rsatadi.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-500 font-semibold text-sm">
              <TrendingUp size={18} />
              <span>Ma’lumot qanday harakat qiladi?</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Xomashyo kirimi &rarr; Stanokda to‘qish &rarr; 10 ta ishlab chiqarish bosqichi (Averlog, Dazmol, Sifat, Qadoqlash...) &rarr; Omborga tayyor mahsulot &rarr; Sotuv va Yetkazib berish &rarr; To‘lov va Qarz nazorati.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-500 font-semibold text-sm">
              <ShieldCheck size={18} />
              <span>Inson omili va ishonchlilik</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Qarzdorlik yoki oylik summalari qo‘lda o‘zgartirilmaydi. Barcha hisob-kitoblar faqat tasdiqlangan hujjatlar (buyurtma, kassa to‘lovi, ishbay harakat) orqali backend tomonidan xatosiz hisoblanadi.
            </p>
          </div>
        </div>
      </div>
    </PageSection>
  );
}
