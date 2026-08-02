"use client";

import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/layout/page-section";
import { ReportCategoryCards } from "./components/report-category-cards";
import { QuickReportShortcuts } from "./components/quick-report-shortcuts";
import { RecentReportsTable } from "./components/recent-reports-table";
import { useReportsOverview } from "./use-reports-overview";

export function ReportsOverviewModule() {
  const { data, error, isError, isPending, refetch } = useReportsOverview();

  if (isPending) {
    return <LoadingState label="Hisobotlar yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Hisobotlar yuklanmadi"
        description={
          error instanceof Error
            ? error.message
            : "Hisobotlar ma’lumotlarini olishda xatolik yuz berdi."
        }
        action={
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const overview = data?.data;

  if (!overview) {
    return (
      <ErrorState
        title="Hisobot ma’lumotlari topilmadi"
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
      <PageSection
        title="Hisobot bo‘limlari"
        description="Kerakli yo‘nalishni tanlang va tegishli ma’lumotlarni ko‘ring."
      >
        <ReportCategoryCards categories={overview.categoryCards} />
      </PageSection>

      <PageSection
        title="Tezkor hisobotlar"
        description="Eng ko‘p ishlatiladigan ma’lumotlarga tez o‘ting."
      >
        <QuickReportShortcuts reports={overview.quickReports} />
      </PageSection>

      <PageSection
        title="So‘nggi hisobotlar"
        description="Oldin tayyorlangan hisobotlar shu yerda ko‘rinadi."
      >
        <p className="mb-4 text-sm text-muted-foreground">
          Hozircha hisobotlar ekranda ko‘riladi. Excel yoki PDF faylga yuklash
          keyingi bosqichda qo‘shiladi.
        </p>
        <RecentReportsTable reports={overview.recentReports} />
      </PageSection>
    </div>
  );
}
