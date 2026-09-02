"use client";

import Link from "next/link";
import { Boxes, ArrowRight, CheckCircle2, AlertTriangle, Layers, Cpu, Scissors, Sparkles, UserCheck } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";
import { InfoCard } from "@/components/cards/info-card";

const STAGES = [
  { order: 1, name: "Averlog", desc: "Boshlang‘ich to‘qima uchi tikiladi" },
  { order: 2, name: "Dazmol", desc: "Paypoq shaklga solinib dazmollanadi" },
  { order: 3, name: "Sifat", desc: "Sifat nazorati va ko‘zdan kechirish" },
  { order: 4, name: "Kiydirish", desc: "Qolipga kiygizish va cho‘zilishini tekshirish" },
  { order: 5, name: "Par Dazmol", desc: "Issiq bug‘da shakl berish" },
  { order: 6, name: "Parlash", desc: "Bug‘lash va yakuniy tekislash" },
  { order: 7, name: "Bezak", desc: "Lenta, bezak yoki qo‘shimcha aksessuar" },
  { order: 8, name: "Etiketka", desc: "Brend yorlig‘i va shtrix-kod tikish" },
  { order: 9, name: "Qadoqlash", desc: "Juftlab paketga yoki qutiga solish" },
  { order: 10, name: "Ombor", desc: "Tayyor mahsulot sifatida omborga kirim" },
];

export function GuideProductionFlow() {
  return (
    <PageSection id="production-flow">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 p-1.5 text-primary">
              <Boxes size={20} />
            </span>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              6. 1-Asosiy Oqim: Ishlab Chiqarish va Stage Inventory
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Ishlab chiqarish — Paypoq OS platformasining asosiy yuragi. Bu yerda mahsulot partiyasi qayerda turgani emas, balki har bir bosqichdagi aniq dona qoldig‘i nazorat qilinadi.
          </p>
        </div>

        {/* Stage Inventory Core Concept Card */}
        <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">
              ★
            </span>
            <div>
              <h4 className="font-bold text-base text-foreground">
                Stage Inventory (Bosqich Inventari) Nima?
              </h4>
              <p className="text-xs text-muted-foreground">
                Paypoq OS dagi eng muhim boshqaruv ko‘rsatkichi
              </p>
            </div>
          </div>

          <p className="text-sm text-foreground leading-relaxed">
            <strong>Stage Inventory</strong> — bu ma’lum bir vaqtda aniq bir ishlab chiqarish bosqichida (masalan, Dazmol yoki Kiydirishda) turgan paypoqlar soni (dona). Fabrika boshqaruvchisi ekranga qaraganda umumiy raqamni emas, qaysi bosqichda necha dona paypoq navbatda turganini ko‘radi.
          </p>

          <div className="grid gap-3 sm:grid-cols-3 pt-1">
            <div className="rounded-xl border bg-card p-3 space-y-1">
              <div className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <CheckCircle2 size={14} /> Manfiy bo‘lolmaydi
              </div>
              <p className="text-[11px] text-muted-foreground">
                Agar Dazmolda 500 dona bo‘lsa, undan 600 dona ko‘chirib bo‘lmaydi. Tizim xatolikning oldini oladi.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-3 space-y-1">
              <div className="text-xs font-bold text-blue-500 flex items-center gap-1">
                <Layers size={14} /> Tiqilishlarni (Bottleneck) topadi
              </div>
              <p className="text-[11px] text-muted-foreground">
                Agar Dazmolda 20 000 dona to‘planib, Sifatda 100 dona bo‘lsa, demak dazmolchilar yetishmayapti.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-3 space-y-1">
              <div className="text-xs font-bold text-amber-500 flex items-center gap-1">
                <Sparkles size={14} /> Shaffof Ombor Handoff
              </div>
              <p className="text-[11px] text-muted-foreground">
                9-bosqich (Qadoqlash)dan 10-bosqich (Ombor)ga ko‘chirilgach, Ombor bo‘limida tayyor paypoqlar asosiy ombor zaxirasiga qabul qilinadi.
              </p>
            </div>
          </div>
        </div>

        {/* 10 Stages Visual Chain */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
            <span>10 ta Standart Bosqich Zanjiri:</span>
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {STAGES.map((s) => (
              <div
                key={s.order}
                className="flex flex-col justify-between rounded-xl border bg-card p-3 transition-all hover:border-primary/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                      {s.order}
                    </span>
                    {s.order === 1 && <span className="text-[9px] rounded bg-blue-500/10 text-blue-500 px-1 font-semibold">Start</span>}
                    {s.order === 10 && <span className="text-[9px] rounded bg-emerald-500/10 text-emerald-500 px-1 font-semibold">Ombor</span>}
                  </div>
                  <div className="font-bold text-xs text-foreground mt-1">{s.name}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-step production cycle */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h4 className="font-bold text-sm text-foreground">
            Sexdagi Kunlik Amaliy Ish Oqimi:
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                1
              </span>
              <div>
                <strong className="text-foreground">Stanokda to‘qish partiyasi: </strong>
                <span className="text-muted-foreground">
                  Stanok tanlanadi, unga operator va mexanik biriktiriladi. Ish boshlangach, to‘qilgan paypoqlar miqdori <strong>«Output qabul qilish»</strong> orqali 1-bosqich (Averlog)ga kiritiladi.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                2
              </span>
              <div>
                <strong className="text-foreground">Bosqichlararo ko‘chirish: </strong>
                <span className="text-muted-foreground">
                  Smena qabul qiluvchi paypoqlar bir bosqichdan ikkinchisiga o‘tganda (masalan, Averlog &rarr; Dazmol) dona sonini kiritadi. Chiqqan bosqich qoldig‘i kamayadi, qabul qilgan bosqich qoldig‘i oshadi.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                3
              </span>
              <div>
                <strong className="text-foreground">Ishchilar bajargan ishlari: </strong>
                <span className="text-muted-foreground">
                  Har bir ishchi (masalan, Dazmolchi yoki Tikuvchi) bajargan dona soni qayd etiladi. Bu o‘sha bosqich ishbay stavkasi va smena ustamasi bo‘yicha to‘g‘ridan-to‘g‘ri ishchining oyligiga (Payroll) hisoblanadi.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                4
              </span>
              <div>
                <strong className="text-foreground">Nuqsonlar (Brak) qaydnomasi: </strong>
                <span className="text-muted-foreground">
                  Agar biror bosqichda yirtilgan yoki noto‘g‘ri to‘qilgan paypoq aniqlansa, nuqson sifatida yoziladi. Nuqson yozuvi avtomatik ishchiga jarima solmaydi — zarur bo‘lsa, jarima alohida qaror bilan belgilanadi.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                5
              </span>
              <div>
                <strong className="text-foreground">Tayyor mahsulotni omborga qabul qilish: </strong>
                <span className="text-muted-foreground">
                  Qadoqlash tugagach, mahsulot 10-bosqich «Ombor»ga o‘tkaziladi va Ombor bo‘limida «Tayyor mahsulot qabul qilish» orqali sotuvga tayyor zaxiraga aylanadi.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/production"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <span>Ishlab chiqarish moduliga o‘tish</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </PageSection>
  );
}
