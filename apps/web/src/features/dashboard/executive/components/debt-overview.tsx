import { InfoCard } from "@/components/cards/info-card";
import { StatusBadge } from "@/components/data-display/status-badge";
import Link from "next/link";
import type { ExecutiveSummary } from "@/lib/api/dashboard";

export function DebtOverview({ kpis }: { kpis: ExecutiveSummary["kpis"] }) {
  const cards = [
    {
      label: "Client qarzi",
      value: `${kpis.totalClientDebt} so‘m`,
      description: "Orders minus payments projection",
      href: "/sales/debts",
    },
    {
      label: "Supplier qarzi",
      value: `${kpis.totalSupplierDebt} so‘m`,
      description: "Purchases minus payments projection",
      href: "/finance/suppliers",
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {cards.map((card) => (
        <InfoCard
          key={card.label}
          title={card.label}
          action={<StatusBadge tone="warning">Backend projection</StatusBadge>}
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
