"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, Compass, Sparkles, ExternalLink } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WALKTHROUGH_STEPS = [
  {
    step: 1,
    title: "Sozlamalarni ko‘zdan kechiring",
    href: "/settings",
    module: "Sozlamalar",
    instruction: "Ranglar, materiallar, mahsulotlar va ishlab chiqarish bosqichlari (/settings/stages) qanday sozlanganini ko‘ring.",
    expectedResult: "Tizimda 10 ta standart bosqich, ranglar va mahsulot modellari mavjudligini ko‘rasiz.",
  },
  {
    step: 2,
    title: "Xodimlarni tekshiring",
    href: "/employees",
    module: "Xodimlar",
    instruction: "Xodimlar ro‘yxatini oching. Ishbay ishchilar, smena qabul qiluvchi va buxgalterlar qanday biriktirilganini ko‘ring.",
    expectedResult: "Xodimlarning rollari, smenalari (Kunduzgi/Kechki) va ish profillari ro‘yxati chiqadi.",
  },
  {
    step: 3,
    title: "Stanoklar va ishlab chiqarishni ko‘ring",
    href: "/machines",
    module: "Stanoklar",
    instruction: "To‘quv stanoklari ro‘yxatini oching. Stanok faoliyati va unga biriktirilgan mexaniklarni ko‘ring.",
    expectedResult: "Har bir stanokning ish holati va oxirgi chiqargan mahsuloti ko‘rinadi.",
  },
  {
    step: 4,
    title: "Bosqich qoldiqlari (Stage Inventory)",
    href: "/production",
    module: "Ishlab chiqarish",
    instruction: "Ishlab chiqarish sahifasini oching. 10 ta bosqich (Averlog, Dazmol, Sifat...) kesimida qancha dona paypoq turganini ko‘ring.",
    expectedResult: "Har bir bosqichdagi aniq dona qoldig‘i va bosqichlararo ko‘chirish (Move) imkoniyati ko‘rinadi.",
  },
  {
    step: 5,
    title: "Ombor zaxiralarini tekshiring",
    href: "/warehouse",
    module: "Ombor",
    instruction: "Ombor bo‘limida Tayyor mahsulot (Finished Products) va Xom ashyo (Raw Materials) qoldiqlarini ko‘ring.",
    expectedResult: "Qadoqlashdan o‘tgan tayyor paypoqlar ombor qoldig‘ida saqlanayotganini ko‘rasiz.",
  },
  {
    step: 6,
    title: "Yangi mijoz va buyurtma yarating",
    href: "/sales/orders",
    module: "Sotuvlar",
    instruction: "Mijoz tanlang, mahsulot modeli, rangi va miqdorini kiritib yangi savdo buyurtmasi (Order) rasmiylashtiring.",
    expectedResult: "Buyurtma shakllanadi, server umumiy summani avtomatik hisoblaydi.",
  },
  {
    step: 7,
    title: "Yetkazib berish va to‘lov qabul qilish",
    href: "/sales/payments",
    module: "To‘lovlar",
    instruction: "Buyurtmani yetkazilgan deb belgilang va mijozdan kelgan qisman yoki to‘liq to‘lovni kiritib buyurtmaga biriktiring.",
    expectedResult: "To‘lov qabul qilinadi va buyurtma balansi yangilanadi.",
  },
  {
    step: 8,
    title: "Mijoz qarzdorligini kuzating",
    href: "/sales/debts",
    module: "Mijoz qarzi",
    instruction: "Mijoz qarzdorligi sahifasini oching. Yetkazilgan tovar summasidan to‘lov ayirilib, sof qarz qolganini ko‘ring.",
    expectedResult: "Mijozning qolgan qarzi real vaqtda avtomatik aks etadi.",
  },
  {
    step: 9,
    title: "Xarajat va yetkazib beruvchilar hisobi",
    href: "/finance/expenses",
    module: "Moliya",
    instruction: "Xarajatlar sahifasida yangi transport yoki material xarajati kiritib, tasdiqlanishini ko‘ring.",
    expectedResult: "Xarajat tasdiqlangach, kompaniya moliyaviy balansida aks etadi.",
  },
  {
    step: 10,
    title: "Boshqaruv paneli (Executive Dashboard)",
    href: "/dashboard/executive",
    module: "Boshqaruv paneli",
    instruction: "Boshqaruv paneliga qayting. Bugungi kiritilgan barcha sotuvlar, tushumlar, qarzlar va ko‘rsatkichlar KPI kartalarida yangilanganini ko‘ring.",
    expectedResult: "Butun fabrikaning yaxlit moliyaviy va operatsion holati bitta ekranda namoyon bo‘ladi.",
  },
];

export function GuideTestWalkthrough() {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepNumber)
        ? prev.filter((s) => s !== stepNumber)
        : [...prev, stepNumber],
    );
  };

  const progressPercent = Math.round((completedSteps.length / WALKTHROUGH_STEPS.length) * 100);

  return (
    <PageSection id="test-walkthrough">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 p-1.5 text-primary">
              <Compass size={20} />
            </span>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              11. 10 Qadamli «Tizimni Sinab Ko‘rish» Amaliy Ssenariysi
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Agar siz Paypoq OS ni birinchi marta ko‘rayotgan bo‘lsangiz, tizim imkoniyatlarini mustaqil sinash uchun quyidagi 10 qadamni birma-bir bajarib chiqing:
          </p>
        </div>

        {/* Interactive Progress Bar */}
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Sinov jarayoni: {completedSteps.length} / {WALKTHROUGH_STEPS.length} qadam bajarildi
            </span>
            <span className="font-bold text-primary">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 10 Step Checklist */}
        <div className="grid gap-3 sm:grid-cols-2">
          {WALKTHROUGH_STEPS.map((item) => {
            const isDone = completedSteps.includes(item.step);
            return (
              <div
                key={item.step}
                className={cn(
                  "flex flex-col justify-between rounded-xl border p-4 transition-all",
                  isDone
                    ? "bg-emerald-500/5 border-emerald-500/30"
                    : "bg-card border-border hover:border-primary/40",
                )}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStep(item.step)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`Qadam ${item.step} ni belgilash`}
                      >
                        {isDone ? (
                          <CheckCircle2 size={20} className="text-emerald-500" />
                        ) : (
                          <Circle size={20} className="text-muted-foreground/60" />
                        )}
                      </button>
                      <span className="font-bold text-xs text-primary">
                        Qadam {item.step}
                      </span>
                    </div>
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {item.module}
                    </span>
                  </div>

                  <h4 className={cn("font-bold text-sm text-foreground", isDone && "line-through text-muted-foreground")}>
                    {item.title}
                  </h4>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.instruction}
                  </p>

                  <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                    <strong className="text-foreground">Natija:</strong> {item.expectedResult}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleStep(item.step)}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    {isDone ? "Bajarilmadi deb belgilash" : "Bajarildi deb belgilash"}
                  </button>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <span>Ochish</span>
                    <ExternalLink size={12} />
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
