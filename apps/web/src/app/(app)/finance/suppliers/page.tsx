import { PageHeader } from "@/components/page-header";
import { FinanceNav } from "@/features/finance/components/finance-nav";
import { SuppliersModule } from "@/features/finance/suppliers/suppliers-module";

export default function SuppliersPage() {
  return (
    <>
      <PageHeader title="Yetkazib beruvchilar" description="Material yetkazib beruvchilar, xaridlar va qarzdorlik holati" />
      <FinanceNav />
      <SuppliersModule />
    </>
  );
}
