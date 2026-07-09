"use client";

import Link from "next/link";
import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";
import { AttentionNeeded } from "./components/attention-needed";
import { BusinessHealthSection } from "./components/business-health-section";
import { DebtOverview } from "./components/debt-overview";
import { ProductionOverview } from "./components/production-overview";
import { RecentActivity } from "./components/recent-activity";
import { SalesOverview } from "./components/sales-overview";
import { TopClients } from "./components/top-clients";
import { TopProducts } from "./components/top-products";
import { useExecutiveSummary } from "./use-executive-summary";

const quickLinks = [
  { label: "Operatsiyalar", href: "/dashboard/operations" },
  { label: "Ishlab chiqarish", href: "/production" },
  { label: "Sotuvlar", href: "/sales" },
  { label: "Moliya", href: "/finance" },
  { label: "Hisobotlar", href: "/reports" },
];

export function ExecutiveDashboard() {
  const { data, error, isError, isPending, refetch } = useExecutiveSummary();

  if (isPending) {
    return <LoadingState label="Boshqaruv paneli yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Boshqaruv paneli yuklanmadi"
        description={
          error instanceof Error
            ? error.message
            : "Boshqaruv paneli ma’lumotlarini olishda xatolik yuz berdi."
        }
        action={
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const summary = data?.data;

  if (!summary) {
    return (
      <ErrorState
        title="Boshqaruv paneli mavjud emas"
        description="Ma’lumotlar hozircha kelmadi."
        action={
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const kpis = [
    {
      label: "Oylik sotuv",
      value: `${summary.kpis.monthlySales} so‘m`,
      description: "Joriy oy, Asia/Tashkent",
      accent: "primary" as const,
    },
    {
      label: "Oylik xarajat",
      value: `${summary.kpis.monthlyExpenses} so‘m`,
      description: "To‘langan xarajatlar",
      accent: "neutral" as const,
    },
    {
      label: "Jami mijoz qarzi",
      value: `${summary.kpis.totalClientDebt} so‘m`,
      description: "Tizim qarz hisob-kitobi",
      accent: "warning" as const,
    },
    {
      label: "Jami yetkazib beruvchi qarzi",
      value: `${summary.kpis.totalSupplierDebt} so‘m`,
      description: "Tizim qarz hisob-kitobi",
      accent: "warning" as const,
    },
    {
      label: "Faol xodimlar",
      value: `${summary.kpis.activeEmployees} ta`,
      description: "Faol xodimlar",
      accent: "success" as const,
    },
    {
      label: "Faol buyurtmalar",
      value: `${summary.kpis.activeOrders} ta`,
      description: "Tasdiqlangan, kutilayotgan yoki tayyor",
      accent: "primary" as const,
    },
    {
      label: "Mahsulot modellari",
      value: `${summary.kpis.totalProducts} ta`,
      description: "Faol mahsulot katalogi",
      accent: "success" as const,
    },
    {
      label: "Past qoldiq materiallar",
      value: `${summary.kpis.lowStockMaterials} ta`,
      description: "Ombor hisoblagan qiymat",
      accent: "danger" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border bg-card px-3 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <PageSection>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <KpiCard key={item.label} {...item} />
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Biznes holati"
        description="Umumiy biznes holati"
      >
        <BusinessHealthSection health={summary.businessHealth} />
      </PageSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProductionOverview kpis={summary.kpis} />
        <SalesOverview kpis={summary.kpis} />
      </div>

      <PageSection
        title="Qarzdorlik ko‘rinishi"
        description="Mijoz va yetkazib beruvchi qarzi tizim tomonidan hisoblangan"
      >
        <DebtOverview kpis={summary.kpis} />
      </PageSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <PageSection title="Eng ko‘p sotilgan mahsulotlar">
          <TopProducts products={summary.topProducts} />
        </PageSection>
        <PageSection title="Eng faol mijozlar">
          <TopClients clients={summary.topClients} />
        </PageSection>
      </div>

      <AttentionNeeded items={summary.attentionItems} />
      <RecentActivity items={summary.recentActivity} />
    </div>
  );
}
