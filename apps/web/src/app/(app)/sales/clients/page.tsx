import { PageHeader } from "@/components/page-header";
import { SalesNav } from "@/features/sales/components/sales-nav";
import { ClientsModule } from "@/features/sales/clients/clients-module";

export default function ClientsPage() {
  return (
    <>
      <PageHeader title="Mijozlar" description="Mijozlar ro‘yxati, aloqa ma’lumotlari va qarzdorlik holati" />
      <SalesNav />
      <ClientsModule />
    </>
  );
}
