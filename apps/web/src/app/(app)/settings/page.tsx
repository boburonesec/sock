import { PageHeader } from "@/components/page-header";
import { SettingsOverviewModule } from "@/features/settings/overview/settings-overview-module";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Sozlamalar"
        description="Tizimni yuritish uchun asosiy ma’lumotlar va dastur hisoblarini boshqarish"
      />
      <SettingsOverviewModule />
    </>
  );
}
