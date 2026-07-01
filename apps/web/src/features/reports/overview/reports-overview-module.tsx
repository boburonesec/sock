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
    return <LoadingState label="Hisobotlar overview yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Hisobotlar overview yuklanmadi"
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
        title="Hisobotlar overview mavjud emas"
        description="Backend kutilgan reports overview response qaytarmadi."
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
        title="Hisobot kategoriyalari"
        description="Backend qaytargan hisobot metadata katalogi."
      >
        <ReportCategoryCards categories={overview.categoryCards} />
      </PageSection>

      <PageSection
        title="Tezkor hisobotlar"
        description="Ko‘p ishlatiladigan umumiy ko‘rinishlar."
      >
        <QuickReportShortcuts reports={overview.quickReports} />
      </PageSection>

      <PageSection
        title="So‘nggi hisobotlar"
        description="Real generated report metadata mavjud bo‘lmaguncha bo‘sh ko‘rsatiladi."
      >
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <Button disabled variant="outline">
            Excel export · Keyingi bosqich
          </Button>
          <Button disabled variant="outline">
            PDF export · Keyingi bosqich
          </Button>
          <Button disabled>Hisobot yaratish · Keyingi bosqich</Button>
        </div>
        <RecentReportsTable reports={overview.recentReports} />
      </PageSection>
    </div>
  );
}
