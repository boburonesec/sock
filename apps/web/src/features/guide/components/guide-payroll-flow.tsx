"use client";

import Link from "next/link";
import { DollarSign, ArrowRight, CheckCircle2, ShieldCheck, Calculator, Clock, PlusCircle, MinusCircle, Check } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";

export function GuidePayrollFlow() {
  return (
    <PageSection id="payroll-flow">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 p-1.5 text-primary">
              <DollarSign size={20} />
            </span>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              10. 5-Asosiy Oqim: Ish Haqi (Payroll) va Ishbay Hisob-Kitob
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Paypoq fabrikasida ishchilar asosiy qismi ishbay (dona hisobida) haq oladi. Tizim har bir xodimning bajargan ishini, smena ustamasini, bonus va avanslarini avtomatik umumlashtiradi.
          </p>
        </div>

        {/* 4 Pillars of Payroll */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
              <Calculator size={16} />
              <span>1. Ishbay Faoliyat</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Shift Receiver kiritgan har bir ish: <strong>Dona soni &times; Bosqich stavkasi</strong>.
            </p>
            <div className="text-[11px] text-muted-foreground pt-1 border-t">
              Masalan: 3 000 dona dazmol &times; 120 so‘m = 360 000 so‘m.
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-500 font-semibold text-xs uppercase tracking-wider">
              <Clock size={16} />
              <span>2. Tungi Ustama</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kechki (NIGHT) smenada ishlagan xodimlarga har bir dona uchun qo‘shimcha tungi ustama qo‘shiladi.
            </p>
            <div className="text-[11px] text-muted-foreground pt-1 border-t">
              Sozlamalarda NIGHT ustamasi oldindan belgilanadi.
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs uppercase tracking-wider">
              <PlusCircle size={16} />
              <span>3. Bonus va Jarimalar</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Xodimga unumdorlik uchun bonus yoki qo‘pol xato/nuqson uchun jarima biriktirilishi mumkin.
            </p>
            <div className="text-[11px] text-muted-foreground pt-1 border-t">
              Har bir tuzatish (Adjustment) sababi bilan yoziladi.
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs uppercase tracking-wider">
              <MinusCircle size={16} />
              <span>4. Olingan Avanslar</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Oy o‘rtasida xodim olgan avans puli oy oxiridagi umumiy hisoblangan oylikdan avtomatik chegiriladi.
            </p>
            <div className="text-[11px] text-muted-foreground pt-1 border-t">
              Avans so‘rovi &rarr; Tasdiq &rarr; Kassa to‘lovi.
            </div>
          </div>
        </div>

        {/* The Full Formula & Cycle */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h4 className="font-bold text-sm text-foreground">
            Xodim Oyligi Qanday Shakllanadi?
          </h4>
          <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono text-foreground border leading-relaxed">
            Qo‘lga Tegadigan Oylik = (Ishbay Ishlar + Tungi Ustama + Bonuslar) — (Jarimalar + Olingan Avanslar)
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-foreground">Payroll Davri Bosqichlari:</div>
            <div className="grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
              <div className="rounded-lg border bg-muted/20 p-2.5">
                <strong className="text-foreground">1. Davrni ochish: </strong>
                Masalan, 1-iyuldan 31-iyulgacha bo‘lgan hisob davri ochiladi.
              </div>
              <div className="rounded-lg border bg-muted/20 p-2.5">
                <strong className="text-foreground">2. Hisoblash & To‘lov: </strong>
                Tizim barcha ishchilarni hisoblaydi, Buxgalter to‘lov kiritadi.
              </div>
              <div className="rounded-lg border bg-muted/20 p-2.5">
                <strong className="text-foreground">3. Davrni yopish: </strong>
                To‘liq to‘langach, davr arxivlanadi va tahrirlash bloklanadi.
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/finance/payroll"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <span>Ish haqi hisob-kitobiga o‘tish</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </PageSection>
  );
}
