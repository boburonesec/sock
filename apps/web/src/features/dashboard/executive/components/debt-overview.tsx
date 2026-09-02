import { InfoCard } from "@/components/cards/info-card";
import { StatusBadge } from "@/components/data-display/status-badge";
import Link from "next/link";
import type { ExecutiveSummary } from "@/lib/api/dashboard";
import { formatCurrency } from "@/lib/utils";

export function DebtOverview({ kpis }: { kpis: ExecutiveSummary["kpis"] }) {
  const cards = [
    {
      label: "Mijoz qarzi",
      value: formatCurrency(kpis.totalClientDebt),
      description: "Buyurtmalar minus to‘lovlar hisob-kitobi",
      href: "/sales/debts",
    },
    {
      label: "Yetkazib beruvchi qarzi",
      value: formatCurrency(kpis.totalSupplierDebt),
      description: "Xaridlar minus to‘lovlar hisob-kitobi",
      href: "/finance/suppliers",
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {cards.map((card) => (
        <InfoCard
          key={card.label}
          title={card.label}
          action={<StatusBadge tone="warning">Tizim hisob-kitob</StatusBadge>}
        >
          <p className="text-2xl font-bold text-amber-500">{card.value}</p>
          <p className="mt-3 text-sm text-muted-foreground">{card.description}</p>
          <Link
            href={card.href}
            className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
          >
            Batafsil ko‘rish
          </Link>
        </InfoCard>
      ))}
    </div>
  );
}
