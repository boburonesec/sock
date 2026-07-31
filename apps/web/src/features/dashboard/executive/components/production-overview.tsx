import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { InfoCard } from "@/components/cards/info-card";
import type { ExecutiveSummary } from "@/lib/api/dashboard";

export function ProductionOverview({ kpis }: { kpis: ExecutiveSummary["kpis"] }) {
  const items = [
    { label: "Faol xodimlar", value: `${kpis.activeEmployees} ta` },
    { label: "Faol buyurtmalar", value: `${kpis.activeOrders} ta` },
    { label: "Mahsulot modellari", value: `${kpis.totalProducts} ta` },
    { label: "Past qoldiq", value: `${kpis.lowStockMaterials} ta` },
  ];

  return (
    <InfoCard
      title="Operatsion ko‘rinish"
      description="Kundalik ish uchun asosiy ko‘rsatkichlar"
      action={
        <Link
          href="/dashboard/operations"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Operatsiyalar <ArrowRight size={15} />
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
