import { EmptyState } from "./empty-state";
import { PageHeader } from "@/components/page-header";
import type { PageDefinition } from "@/lib/navigation";

export function PlaceholderPage({ page }: { page: PageDefinition }) {
  return <><PageHeader title={page.title} description={page.description} /><EmptyState title="Bu bo‘lim tayyorlanmoqda" description="Hozircha faqat ilova foundation’i mavjud." /></>;
}
