"use client";

import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";
import { RecentOrdersTable } from "./components/recent-orders-table";
import { TopClientsTable } from "./components/top-clients-table";
import { useSalesSummary } from "./use-sales-summary";

export function SalesOverviewModule() {
  const { data, error, isError, isPending, refetch } = useSalesSummary();

  if (isPending) {
    return <LoadingState label="Sotuv xulosasi yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Sotuv xulosasi yuklanmadi"
        description={
          error instanceof Error
            ? error.message
            : "Ma’lumotlarni olishda xatolik yuz berdi."
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
        title="Sotuv xulosasi mavjud emas"
        description="Ma’lumotlar hozircha kelmadi."
        action={
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageSection>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Mijozlar"
            value={`${summary.kpis.clientCount} ta`}
            description="Faol mijozlar soni"
            accent="primary"
          />
          <KpiCard
            label="Faol buyurtmalar"
            value={`${summary.kpis.activeOrderCount} ta`}
            description="Tizim hisoblagan faol buyurtmalar"
            accent="success"
          />
          <KpiCard
            label="Oylik sotuv"
            value={`${summary.kpis.monthlySales} so‘m`}
            description="Joriy oy, Asia/Tashkent"
            accent="primary"
          />
          <KpiCard
            label="Jami mijoz qarzi"
            value={`${summary.kpis.totalClientDebt} so‘m`}
            description="Tizim qarz hisob-kitobi qiymati"
            accent="warning"
          />
        </div>
      </PageSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <PageSection
          title="Eng faol mijozlar"
          description="Tizim qaytargan eng faol mijozlar ro‘yxati"
        >
          <TopClientsTable clients={summary.topClients} />
        </PageSection>

        <PageSection
          title="So‘nggi buyurtmalar"
          description="Draft va bekor qilingan buyurtmalar kiritilmagan"
        >
          <RecentOrdersTable orders={summary.recentOrders} />
        </PageSection>
      </div>
    </div>
  );
}
