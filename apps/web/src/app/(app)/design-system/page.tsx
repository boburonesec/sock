import { DesignSystemExamples } from "@/components/examples/design-system-examples";
import { PageHeader } from "@/components/page-header";
import { PageSection } from "@/components/layout/page-section";

export default function DesignSystemPage() {
  return <><PageHeader title="Dizayn tizimi" description="Qayta ishlatiladigan UI elementlari namunalari" /><PageSection><DesignSystemExamples /></PageSection></>;
}
