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
        description="Bildirishnoma markazi ulangan. Hozircha yuborilgan xabarlar yo‘q yoki hali yozuvlar yaratilmagan. Keyinchalik past ombor, muddat va avans tasdiqlari shu yerda chiqadi."
      />
    </>
  );
}