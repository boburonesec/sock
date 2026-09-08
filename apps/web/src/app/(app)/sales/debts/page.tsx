import { PageHeader } from "@/components/page-header";
import { SalesNav } from "@/features/sales/components/sales-nav";
import { DebtsModule } from "@/features/sales/debts/debts-module";

export default function DebtsPage() {
  return (
    <>
      <PageHeader title="Mijoz qarzdorligi" description="Mijozlarning umumiy qarzdorligi va balans hisoboti" />
      <SalesNav />
      <DebtsModule />
    </>
  );
}
