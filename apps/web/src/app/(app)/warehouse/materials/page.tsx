import { PageHeader } from "@/components/page-header";
import { WarehouseNav } from "@/features/warehouse/components/warehouse-nav";
import { MaterialsModule } from "@/features/warehouse/materials/materials-module";

export default function MaterialsPage() {
  return (
    <>
      <PageHeader title="Materiallar" description="Ombordagi xomashyo va butlovchi qismlar holati" />
      <WarehouseNav />
      <MaterialsModule />
    </>
  );
}
