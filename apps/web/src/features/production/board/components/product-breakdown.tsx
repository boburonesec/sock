import { DataTable, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { InfoCard } from "@/components/cards/info-card";
import { formatNumber } from "@/lib/utils";
import type { ProductionOperationsSummary, StageInventory } from "@/lib/api/production";

type StageTotal = ProductionOperationsSummary["stageTotals"][number];

export function ProductBreakdown({ stage, inventory }: { stage: StageTotal; inventory: StageInventory[] }) {
  return <InfoCard title={`${stage.stageName} — mahsulot tarkibi`} description="Bu bosqichdagi mahsulotlar rang, material va mavsum bo‘yicha"><DataTable label={`${stage.stageName} mahsulot tarkibi`} className="-mx-5 -mb-5 rounded-t-none border-x-0 border-b-0"><DataTableHead><DataTableRow><DataTableHeader>Model</DataTableHeader><DataTableHeader>Rang</DataTableHeader><DataTableHeader>Material</DataTableHeader><DataTableHeader>Mavsum</DataTableHeader><DataTableHeader>Miqdor</DataTableHeader></DataTableRow></DataTableHead><tbody>{inventory.length > 0 ? inventory.map((item) => <DataTableRow key={item.id}><DataTableCell className="font-semibold">{item.productVariant.product.name}</DataTableCell><DataTableCell>{item.productVariant.color.name}</DataTableCell><DataTableCell>{item.productVariant.material.name}</DataTableCell><DataTableCell>{item.productVariant.season.name}</DataTableCell><DataTableCell>{formatNumber(item.quantity)} dona</DataTableCell></DataTableRow>) : <EmptyTableState colSpan={5} title="Mahsulot mavjud emas" description="Bu bosqichda hozircha mahsulot yo‘q." />}</tbody></DataTable></InfoCard>;
}
