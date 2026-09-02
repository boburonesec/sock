"use client";

import Link from "next/link";
import { Building2, ArrowRight, CheckCircle2, AlertTriangle, Wallet, FileText, PackagePlus } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";

export function GuideSupplierFlow() {
  return (
    <PageSection id="supplier-flow">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 p-1.5 text-primary">
              <Building2 size={20} />
            </span>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              9. 4-Asosiy Oqim: Xomashyo Xaridi va Yetkazib Beruvchilar (Suppliers)
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Ip, rezin, paket va boshqa xomashyo yetkazib beruvchilar bilan moliyaviy hisob-kitoblar va ta’minot qarzlari.
          </p>
        </div>

        {/* 3 Step Supplier Cycle */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <FileText size={18} />
              <span>1. Xarid Hujjati (Purchase)</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ta’minotchi tanlanadi va xarid qilingan xomashyo (masalan, 500 kg Paxta ipi) summasi kiritiladi.
            </p>
            <div className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">
              <strong>Natija:</strong> Bizning ta’minotchi oldidagi qarzimiz (Supplier Debt) xarid summasiga oshadi.
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-blue-500 font-bold text-sm">
              <PackagePlus size={18} />
              <span>2. Omborga Kirim Qilish</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Xarid hujjati faqat pul qarzini shakllantiradi. Tovar omborga jismonan yetib kelganda, Omborchi alohida <strong>Kirim (Receipt)</strong> yozadi.
            </p>
            <div className="rounded-lg bg-blue-500/10 p-2 text-[11px] text-blue-600 dark:text-blue-400">
              <strong>Muhim:</strong> Moliyaviy xarid va ombor kirimi bir-biridan mustaqil ishlaydi.
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
              <Wallet size={18} />
              <span>3. To‘lov (Supplier Payment)</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Buxgalter ta’minotchiga pul o‘tkazganda yoki naqd berganda to‘lovni qayd etadi.
            </p>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-[11px] text-emerald-600 dark:text-emerald-400">
              <strong>Natija:</strong> Ta’minotchi oldidagi qarzimiz to‘langan summa miqdorida kamayadi.
            </div>
          </div>
        </div>

        {/* Supplier Debt formula */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h4 className="font-bold text-sm text-foreground">
            Yetkazib Beruvchi Qarzi Qanday Hisoblanadi?
          </h4>
          <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono text-foreground border">
            Ta’minotchi Qarzi = Jami Xaridlar Summasi — To‘langan Barcha To‘lovlar
          </div>
          <p className="text-xs text-muted-foreground">
            Tizim orqali har bir ta’minotchining batafsil akt-sverkasini va barcha xarid-to‘lov tarixini bir zumda ko‘rish mumkin.
          </p>

          <div className="pt-2">
            <Link
              href="/finance/suppliers"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <span>Yetkazib beruvchilar moduliga o‘tish</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </PageSection>
  );
}
