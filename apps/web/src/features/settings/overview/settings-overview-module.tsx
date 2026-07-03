"use client";

import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/layout/page-section";
import { ConfigurationHealthSection } from "./components/configuration-health-section";
import { RecentSettingsChangesTable } from "./components/recent-settings-changes-table";
import { SettingsCategoryCards } from "./components/settings-category-cards";
import { useSettingsOverview } from "./use-settings-overview";

export function SettingsOverviewModule() {
  const router = useRouter();
  const { data, error, isError, isPending, refetch } = useSettingsOverview();

  if (isPending) {
    return <LoadingState label="Sozlamalar overview yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Sozlamalar overview yuklanmadi"
        description={
          error instanceof Error
            ? error.message
            : "Sozlamalar ma’lumotlarini olishda xatolik yuz berdi."
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
        title="Sozlamalar overview mavjud emas"
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
        title="Sozlamalar kategoriyalari"
        description="Sozlamalar asosan Manager va Owner tomonidan boshqariladi."
      >
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/settings/telegram")}
          >
            Telegram tokenlar
          </Button>
          <Button disabled variant="outline">
            Import qilish · Tez orada
          </Button>
          <Button disabled variant="outline">
            Export qilish · Tez orada
          </Button>
          <Button disabled>Yangi sozlama qo‘shish · Tez orada</Button>
        </div>
        <SettingsCategoryCards categories={overview.categoryCards} />
      </PageSection>

      <PageSection
        title="Sozlamalar holati"
        description="Asosiy master data sozlamalarining tizim hisoblagan qisqa holati."
      >
        <ConfigurationHealthSection items={overview.configurationHealth} />
      </PageSection>

      <PageSection
        title="So‘nggi sozlama o‘zgarishlari"
        description="AuditLog-backed settings history ulanmaguncha bo‘sh ko‘rsatiladi."
      >
        <RecentSettingsChangesTable changes={overview.recentChanges} />
      </PageSection>
    </div>
  );
}
