import { PlaceholderPage } from "@/components/shared/placeholder-page";
import { getPageDefinition } from "@/lib/navigation";

export default async function FoundationPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const pathname = slug ? `/${slug.join("/")}` : "/";
  return <PlaceholderPage page={getPageDefinition(pathname)} />;
}
