import { PageHeader } from "@/components/page-header";
import { WarehouseNav } from "@/features/warehouse/components/warehouse-nav";
import { MovementsModule } from "@/features/warehouse/movements/movements-module";

export default function MovementsPage() {
  return (
    <>
      <PageHeader title="Kirim-chiqim" description="Omborga kirim, chiqim va ichki ko‘chirishlar tarixi" />
      <WarehouseNav />
      <MovementsModule />
    </>
  );
}
