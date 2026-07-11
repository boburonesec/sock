import { PageHeader } from "@/components/page-header";
import { ZonesModule } from "@/features/warehouse/zones/zones-module";

export default function ZonesPage() {
  return (
    <>
      <PageHeader
        title="Ombor zonalari"
        description="Asosiy ombor ichidagi zona qoldiqlari va harakatlari"
      />
      <ZonesModule />
    </>
  );
}
