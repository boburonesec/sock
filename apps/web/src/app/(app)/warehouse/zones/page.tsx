import { PageHeader } from "@/components/page-header";
import { WarehouseNav } from "@/features/warehouse/components/warehouse-nav";
import { ZonesModule } from "@/features/warehouse/zones/zones-module";

export default function ZonesPage() {
  return (
    <>
      <PageHeader title="Zonalar" description="Ombor zonalari va ulardagi qoldiqlar joylashuvi" />
      <WarehouseNav />
      <ZonesModule />
    </>
  );
}
