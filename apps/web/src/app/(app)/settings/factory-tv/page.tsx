import { PageHeader } from "@/components/page-header";
import { FactoryTvSettingsPage } from "@/features/settings/factory-tv/factory-tv-settings-page";

export default function SettingsFactoryTvPage() {
  return (
    <>
      <PageHeader
        title="Fabrika TV"
        description="Sex zalidagi ekran uchun havola yaratish va boshqarish"
      />
      <FactoryTvSettingsPage />
    </>
  );
}
