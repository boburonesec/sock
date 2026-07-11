import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Bildirishnomalar"
        description="Past qoldiq, muddat va tasdiq kutilayotgan hodisalar"
      />
      <EmptyState
        title="Hozircha bildirishnoma yo‘q"
        description="Avtomatik bildirishnoma markazi keyingi bosqichda. Past qoldiq va avans holatini hozir Ombor / Moliya bo‘limlaridan kuzating."
      />
    </>
  );
}