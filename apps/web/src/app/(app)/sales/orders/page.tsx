import { PageHeader } from "@/components/page-header";
import { SalesNav } from "@/features/sales/components/sales-nav";
import { OrdersModule } from "@/features/sales/orders/orders-module";

export default function OrdersPage() {
  return (
    <>
      <PageHeader title="Buyurtmalar" description="Mijoz buyurtmalari, holati va alohida to‘lov ko‘rinishi" />
      <SalesNav />
      <OrdersModule />
    </>
  );
}
