import { PageHeader } from "@/components/page-header";
import { ProductionBoard } from "@/features/production/board/production-board";

export default function ProductionPage() {
  return <><PageHeader title="Ishlab chiqarish" description="Bosqichlar bo‘yicha mahsulotlar holati va ishlab chiqarish oqimi" /><ProductionBoard /></>;
}
