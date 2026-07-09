import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { InfoCard } from "@/components/cards/info-card";
import type { ExecutiveSummary } from "@/lib/api/dashboard";

export function SalesOverview({ kpis }: { kpis: ExecutiveSummary["kpis"] }) {
  const items = [
    { label: "Oylik sotuv", value: `${kpis.monthlySales} so‘m` },
    { label: "Oylik xarajat", value: `${kpis.monthlyExpenses} so‘m` },
    { label: "Mijoz qarzi", value: `${kpis.totalClientDebt} so‘m` },
    { label: "Yetkazib beruvchi qarzi", value: `${kpis.totalSupplierDebt} so‘m` },
  ];

  return (
    <InfoCard
      title="Sotuv va moliya ko‘rinishi"
      description="Tizim hisoblagan oylik va qarzdorlik qiymatlari"
      action={
        <Link
          href="/sales"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Sotuvlar <ArrowRight size={15} />
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-muted/60 p-3">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-lg font-bold">{item.value}</p>
          </div>
        ))}
      </div>
    </InfoCard>
  );
}
