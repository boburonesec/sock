import { EmptyState } from "./empty-state";
import { PageHeader } from "@/components/page-header";
import type { PageDefinition } from "@/lib/navigation";

/**
 * Catch-all for unknown paths only. Known modules must have real pages under app/.
 */
export function PlaceholderPage({ page }: { page: PageDefinition }) {
  return (
    <>
      <PageHeader title={page.title} description={page.description} />
      <EmptyState
        title={`${page.title} bo‘limi`}
        description="Bu yo‘l uchun alohida ekran hali yo‘q. Asosiy menyu bo‘limlari alohida sahifa sifatida ulangan. Agar kerak bo‘lsa, shu bo‘limni keyingi sprintda to‘liq form bilan kengaytiramiz."
      />
    </>
  );
}
