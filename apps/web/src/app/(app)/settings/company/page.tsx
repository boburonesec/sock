import { PageHeader } from "@/components/page-header";
import { CompanySettingsPage } from "@/features/settings/company/company-settings-page";

export default function CompanySettingsRoute() {
  return (
    <>
      <PageHeader
        title="Korxona sozlamalari"
        description="Filiallar va menejer accountlarini boshqarish"
      />
      <CompanySettingsPage />
    </>
  );
}
