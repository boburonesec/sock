import { PageHeader } from "@/components/page-header";
import { SalesNav } from "@/features/sales/components/sales-nav";
import { PaymentsModule } from "@/features/sales/payments/payments-module";

export default function PaymentsPage() {
  return (
    <>
      <PageHeader title="To‘lovlar" description="Mijoz to‘lovlari va ularning buyurtmalarga taqsimlanishi" />
      <SalesNav />
      <PaymentsModule />
    </>
  );
}
