"use client";

import Link from "next/link";
import { Package, ArrowRight, ArrowDownRight, ArrowUpRight, Repeat, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";

const ZONES_LIST = [
  { name: "Finished Products (Tayyor mahsulot)", desc: "Sotuvga tayyor paypoqlar zaxirasi", tone: "text-emerald-500" },
  { name: "Raw Materials (Xom ashyo)", desc: "To‘qish uchun ip, paxta, neylon, elastan", tone: "text-blue-500" },
  { name: "Packaging (Qadoqlash)", desc: "Paketlar, polietilen va karton qutilar", tone: "text-amber-500" },
  { name: "Labels (Etiketka)", desc: "Brend etiketkalari va shtrix-kod yorliqlari", tone: "text-purple-500" },
  { name: "Defects (Nuqsonlar / Brak)", desc: "Yaroqsiz deb topilgan mahsulotlar", tone: "text-red-500" },
];

const MOVEMENT_TYPES = [
  { title: "Kirim (Receipt)", desc: "Yetkazib beruvchidan ip yoki material omborga kelganda kiritiladi.", icon: ArrowDownRight },
  { title: "Sexga chiqim (Issue)", desc: "Ishlab chiqarish uchun xomashyo sexga berilganda yoziladi.", icon: ArrowUpRight },
  { title: "Ishlab chiqarishdan kirim", desc: "Paypoq tayyor bo‘lib, Ombor bosqichiga yetganda avtomatik qo‘shiladi.", icon: CheckCircle2 },
  { title: "Zonalararo ko‘chirish (Transfer)", desc: "Tovarlarni bir zonadan ikkinchi zonaga siljitish.", icon: Repeat },
  { title: "Qoldiqni to‘g‘rilash (Correction)", desc: "Inventarizatsiyada farq chiqsa, sababini ko‘rsatgan holda to‘g‘rilash.", icon: AlertCircle },
];

export function GuideWarehouseFlow() {
  return (
    <PageSection id="warehouse-flow">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 p-1.5 text-primary">
              <Package size={20} />
            </span>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              7. 2-Asosiy Oqim: Ombor va Zonalarda Mahsulot Harakati
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Omborda tayyor paypoqlar va xomashyo materiallari aniq zonalar bo‘yicha ajratilgan holda yuritiladi.
          </p>
        </div>

        {/* Zones & Movements Breakdown */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Zones */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
              <span>Ombor Zonalari nima uchun kerak?</span>
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bitta ombor ichida mahsulotlar aralashib ketmasligi uchun 5 ta mantiqiy zona mavjud:
            </p>

            <div className="space-y-2 pt-1">
              {ZONES_LIST.map((z, idx) => (
                <div key={idx} className="rounded-lg border bg-muted/30 p-2.5 flex items-start gap-2.5">
                  <span className={`font-bold text-sm ${z.tone}`}>•</span>
                  <div>
                    <div className="text-xs font-semibold text-foreground">{z.name}</div>
                    <div className="text-[11px] text-muted-foreground">{z.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Movements */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h4 className="font-bold text-sm text-foreground">
              Ombor Kirim-Chiqim Turlari (Stock Movements)
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ombordagi har bir dona tovar harakati qat’iy ro‘yxatga olinadi va auditda saqlanadi:
            </p>

            <div className="space-y-2 pt-1">
              {MOVEMENT_TYPES.map((m, idx) => {
                const Icon = m.icon;
                return (
                  <div key={idx} className="rounded-lg border bg-muted/30 p-2.5 flex items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-primary/10 text-primary">
                      <Icon size={14} />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{m.title}</div>
                      <div className="text-[11px] text-muted-foreground">{m.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Low Stock Threshold Warning Card */}
        <div className="rounded-xl border bg-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              <span>Low Stock (Kam Qoldiq) Limitlari</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Har bir xomashyo (masalan, Qora ip yoki Katta quti) uchun minimal xavfsiz qoldiq limitini belgilash mumkin. Qoldiq limitdan kamaysa, tizim darhol ogohlantiradi.
            </p>
          </div>
          <Link
            href="/warehouse"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <span>Omborni ko‘rish</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </PageSection>
  );
}
