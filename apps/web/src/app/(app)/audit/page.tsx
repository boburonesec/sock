import { PageHeader } from "@/components/page-header";
import { AuditModule } from "@/features/audit/audit-module";

export default function AuditPage() {
  return (
    <>
      <PageHeader
        title="Audit jurnali"
        description="Kim qachon qanday operatsiyani bajargani — tarix saqlanadi"
      />
      <AuditModule />
    </>
  );
}
