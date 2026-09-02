import { PageHeader } from "@/components/page-header";
import { GuideModule } from "@/features/guide/guide-module";

export default function GuidePage() {
  return (
    <>
      <PageHeader
        title="Tizim Qo‘llanmasi va Biznes Yo‘riqnomasi"
        description="Paypoq OS imkoniyatlari, korxona rollari, ishlab chiqarish, ombor, sotuv va moliya oqimlari bo‘yicha to‘liq qo‘llanma"
      />
      <GuideModule />
    </>
  );
}
