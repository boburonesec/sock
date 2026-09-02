"use client";

import Link from "next/link";
import { ShoppingCart, Truck, CreditCard, ArrowRight, CheckCircle2, ShieldCheck, AlertOctagon } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";

export function GuideSalesDebtFlow() {
  return (
    <PageSection id="sales-debt-flow">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 p-1.5 text-primary">
              <ShoppingCart size={20} />
            </span>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              8. 3-Asosiy Oqim: Sotuv, Yetkazib Berish va Mijoz Qarzi
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Savdo bo‘limida mijozlar bilan ishlash, buyurtmalarni rasmiylashtirish, tovarlarni jo‘natish va qarzlar hisobi qat’iy qoidalar asosida ishlaydi.
          </p>
        </div>

        {/* 4 Step Sales Cycle Diagram */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
              <span className="text-[10px] text-muted-foreground">Sotuvchi</span>
            </div>
            <h4 className="font-bold text-sm text-foreground">Buyurtma (Order)</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mijoz tanlanadi, paypoq modeli, rangi va miqdori kiritiladi. Mahsulot narxi buyurtma ochilgan paytda muzlatiladi.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-500">2</span>
              <span className="text-[10px] text-muted-foreground">Ombor / Sex</span>
            </div>
            <h4 className="font-bold text-sm text-foreground">Tayyorlik holati</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Omborda tayyor mahsulot yetarli bo‘lsa, buyurtma darhol «Tayyor» (Ready) holatiga o‘tadi yoki sexga ishlab chiqarishga buyurtma bo‘ladi.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-500">3</span>
              <span className="text-[10px] text-muted-foreground">Yetkazish</span>
            </div>
            <h4 className="font-bold text-sm text-foreground">Yetkazib berish (Delivery)</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mahsulot mijozga yetkazilgach, ombor qoldig‘idan kamaytiriladi va buyurtma «Yetkazildi» (Delivered) belgilanadi.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-500">4</span>
              <span className="text-[10px] text-muted-foreground">Buxgalter / Kassa</span>
            </div>
            <h4 className="font-bold text-sm text-foreground">To‘lov va Qarz</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mijozdan to‘lov qabul qilinib tegishli buyurtmaga taqsimlanadi. Qolgan to‘lanmagan summa esa mijoz qarzi sifatida aks etadi.
            </p>
          </div>
        </div>

        {/* 2 Vital Business Rules */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Rule 1: Delivery Policy */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Truck size={18} />
              <span>Yetkazib Berish va To‘lov Siyosati:</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Paypoq fabrikasi biznes qoidasiga binoan:
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Yetkazib berish sex tomonidan amalga oshiriladi va mijoz uchun bepul.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>To‘liq to‘lanmagan bo‘lsa ham yetkazish mumkin:</strong> Buyurtma yetkazilganda to‘lov kutilishi shart emas; yetkazilgan tovar summasi avtomatik tarzda mijoz qarzdorligiga yoziladi va mijoz keyin to‘laydi.</span>
              </li>
            </ul>
          </div>

          {/* Rule 2: Client Debt */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
              <CreditCard size={18} />
              <span>Mijoz Qarzdorligi Qanday Hisoblanadi?</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mijoz qarzi sun’iy ravishda yoki qo‘lda yozilmaydi:
            </p>
            <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono text-foreground border">
              Mijoz Qarzi = Jami Tasdiqlangan Buyurtmalar — Qabul Qilingan To‘lovlar
            </div>
            <p className="text-[11px] text-muted-foreground">
              Har safar yangi to‘lov kiritilganda, mijozning umumiy qarzi shu summa miqdorida avtomatik ravishda kamayadi.
            </p>
          </div>
        </div>

        <div className="pt-1">
          <Link
            href="/sales"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <span>Sotuvlar moduliga o‘tish</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </PageSection>
  );
}
