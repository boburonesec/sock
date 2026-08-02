"use client";

import { Building2, ChevronRight, KeyRound, Layers, Palette, Package, Shirt, Tags, Users, WalletCards, Warehouse } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/layout/page-section";
import { useAuthStore } from "@/stores/auth-store";
import { ConfigurationHealthSection } from "./components/configuration-health-section";
import { RecentSettingsChangesTable } from "./components/recent-settings-changes-table";
import { SettingsCategoryCards } from "./components/settings-category-cards";
import { useSettingsOverview } from "./use-settings-overview";

const ownerOnlyCategoryIds = new Set(["roles"]);

const settingsHubItems = [
  {
    href: "/settings/company",
    title: "Korxona",
    description: "Filiallar, operatorlar va hisob ruxsatlari",
    icon: Building2,
    ownerOnly: true,
  },
  {
    href: "/settings/company",
    title: "Operatorlar",
    description: "Dasturga kiradigan hisoblar (menejer, sotuvchi…). Ishbay ishchilar — Xodimlar",
    icon: Users,
    ownerOnly: true,
  },
  {
    href: "/settings/products",
    title: "Mahsulotlar",
    description: "Mahsulotlar va ularning rang-material turlari",
    icon: Shirt,
  },
  {
    href: "/settings/colors",
    title: "Ranglar",
    description: "Mahsulot turlari uchun ranglar",
    icon: Palette,
  },
  {
    href: "/settings/materials",
    title: "Materiallar",
    description: "Mahsulot va xomashyo materiallari",
    icon: Package,
  },
  {
    href: "/settings/seasons",
    title: "Mavsumlar",
    description: "Mahsulot mavsum atributlari",
    icon: Tags,
  },
  {
    href: "/settings/stages",
    title: "Bosqichlar",
    description: "Bosqichlar bo‘yicha ishlab chiqarish oqimi",
    icon: Layers,
  },
  {
    href: "/settings/salary-rates",
    title: "Stavkalar",
    description: "Ishbay haq uchun bosqich stavkalari",
    icon: WalletCards,
  },
  {
    href: "/settings/zones",
    title: "Ombor zonalari",
    description: "Ombor zonalari va joylashuvlar",
    icon: Warehouse,
  },
  {
    href: "/settings/thresholds",
    title: "Limitlar",
    description: "Kam qoldiq va operatsion chegaralar",
    icon: KeyRound,
  },
  {
    href: "/settings/telegram",
    title: "Telegram",
    description: "Bot ulanishlari va tokenlar",
    icon: KeyRound,
  },
];

export function SettingsOverviewModule() {
  const roles = useAuthStore((state) => state.roles);
  const isOwner = roles.includes("Owner");
  const { data, error, isError, isPending, refetch } = useSettingsOverview();

  if (isPending) {
    return <LoadingState label="Sozlamalar yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Sozlamalar yuklanmadi"
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
        title="Sozlama ma’lumotlari topilmadi"
        description="Ma’lumotlar hozircha kelmadi."
        action={
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const visibleHubItems = settingsHubItems.filter((item) => !item.ownerOnly || isOwner);
  const visibleCategoryCards = overview.categoryCards.filter(
    (category) => isOwner || !ownerOnlyCategoryIds.has(category.id),
  );
  const visibleConfigurationHealth = overview.configurationHealth.filter(
    (item) => isOwner || (item.id !== "permissions" && item.id !== "roles"),
  );

  return (
    <div className="space-y-8">
      <PageSection
        title="Tizim boshqaruvi"
    description="Yaratish va boshqarish ishlari shu markazda jamlangan. Asosiy panellar kuzatuv va hisobot uchun toza qoladi."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleHubItems.map(({ href, title, description, icon: Icon, ownerOnly }) => (
            <Link
              key={`${title}-${href}`}
              href={href}
              className="panel flex min-h-28 items-start gap-4 p-4 transition-colors hover:border-primary/45 hover:bg-muted/40"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold">
                  {title}
                  {ownerOnly ? (
                    <span className="rounded-md border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      Faqat egasi
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
              </span>
              <ChevronRight className="mt-1 shrink-0 text-muted-foreground" size={18} />
            </Link>
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Master-data holati"
        description={
          isOwner
            ? "Tizim hisoblagan sozlama kategoriyalari."
            : "Tizim hisoblagan sozlama kategoriyalari. Operator, filial va rol boshqaruvi korxona egasida qoladi."
        }
      >
        <SettingsCategoryCards categories={visibleCategoryCards} />
      </PageSection>

      <PageSection
        title="Sozlamalar holati"
        description="Asosiy ma’lumotlar sozlamalarining qisqa holati."
      >
        <ConfigurationHealthSection items={visibleConfigurationHealth} />
      </PageSection>

      <PageSection
        title="So‘nggi sozlama o‘zgarishlari"
        description="Sozlamalar tarixi ulanmaguncha bu bo‘lim bo‘sh ko‘rsatiladi."
      >
        <RecentSettingsChangesTable changes={overview.recentChanges} />
      </PageSection>
    </div>
  );
}
