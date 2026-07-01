import { PageHeader } from "@/components/page-header";
import { AdvancesModule } from "@/features/finance/advances/advances-module";

export default function AdvancesPage() {
  return <><PageHeader title="Avanslar" description="Xodim avans so‘rovlari, tasdiqlash va to‘lov holati" /><AdvancesModule /></>;
}
