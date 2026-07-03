"use client";

import { KpiCard } from "@/components/cards/kpi-card";
import { InfoCard } from "@/components/cards/info-card";
import { DataTable, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-display/data-table";
import { PriorityBadge } from "@/components/data-display/priority-badge";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { ProductionTrendChart } from "./components/production-trend-chart";
import { StageInventoryCard } from "./components/stage-inventory-card";
import { useOperationsSummary } from "./use-operations-summary";

export function OperationsDashboard() {
  const { data, error, isError, isPending, refetch } = useOperationsSummary();

  if (isPending) {
    return <LoadingState label="Operatsion ma’lumotlar yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Operatsion ma’lumotlar yuklanmadi"
        description={error instanceof Error ? error.message : "Ma’lumotlarni olishda xatolik yuz berdi."}
        action={<Button type="button" variant="outline" onClick={() => refetch()}>Qayta urinish</Button>}
      />
    );
  }

  const summary = data.data;
  const kpis = [
    { label: "Bugungi ishlab chiqarish", value: `${formatNumber(Number(summary.kpis.todayProduction))} dona`, description: "Bugungi ishchi faolligi", accent: "primary" as const },
    { label: "Jami jarayondagi mahsulot", value: `${formatNumber(Number(summary.kpis.totalInProgress))} dona`, description: "Bosqichlardagi umumiy qoldiq", accent: "warning" as const },
    { label: "Eng band bosqich", value: summary.kpis.busiestStageName ?? "—", description: summary.kpis.busiestStageName ? "Eng katta bosqich qoldig‘i" : "Hozircha mahsulot yo‘q", accent: "danger" as const },
    { label: "Aktiv ishchilar", value: `${formatNumber(Number(summary.kpis.activeWorkers))} nafar`, description: "Bugungi kiritilgan faollik", accent: "success" as const },
  ];

  return <div className="space-y-8"><PageSection><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}</div></PageSection>
    <PageSection title="Bosqich inventari" description="Tizim hisoblagan har bir ishlab chiqarish bosqichidagi hozirgi mahsulot miqdori">{summary.stageTotals.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{summary.stageTotals.map((stage) => <StageInventoryCard key={stage.stageId} stage={stage} />)}</div> : <EmptyState title="Bosqichlar mavjud emas" description="Active ishlab chiqarish bosqichlari sozlangandan keyin ular shu yerda ko‘rinadi." />}</PageSection>
    <div className="grid gap-6 xl:grid-cols-5"><div className="xl:col-span-3"><ProductionTrendChart trend={summary.trend} /></div><InfoCard className="xl:col-span-2" title="Tiqilib qolgan jarayonlar" description="Belgilangan limitlar asosida aniqlangan bosqichlar">{summary.bottlenecks.length > 0 ? <div className="space-y-3">{summary.bottlenecks.map((stage) => <div key={stage.stageId} className="flex items-center justify-between rounded-lg bg-muted/60 p-3"><div><p className="text-sm font-semibold">{stage.stageName}</p><p className="mt-1 text-xs text-muted-foreground">{formatNumber(Number(stage.quantity))} dona kutilmoqda</p></div><PriorityBadge priority={stage.priority.toLowerCase() as "low" | "medium" | "high"} /></div>)}</div> : <p className="text-sm text-muted-foreground">Hozircha tiqilib qolgan jarayon aniqlanmadi.</p>}</InfoCard></div>
    <PageSection title="Bugungi eng faol ishchilar" description="Smena qabul qiluvchi kiritgan tizim hisoblagan faolliklar">{summary.topWorkers.length > 0 ? <DataTable label="Bugungi eng faol ishchilar"><DataTableHead><DataTableRow><DataTableHeader>Xodim</DataTableHeader><DataTableHeader>Bosqich</DataTableHeader><DataTableHeader>Miqdor</DataTableHeader><DataTableHeader>Hisoblangan summa</DataTableHeader></DataTableRow></DataTableHead><tbody>{summary.topWorkers.map((worker) => <DataTableRow key={`${worker.employeeId}-${worker.stageName}`}><DataTableCell className="font-semibold">{worker.employeeName}</DataTableCell><DataTableCell>{worker.stageName}</DataTableCell><DataTableCell>{formatNumber(Number(worker.quantity))} dona</DataTableCell><DataTableCell className="font-semibold">{worker.amount} so‘m</DataTableCell></DataTableRow>)}</tbody></DataTable> : <EmptyState title="Bugungi ishchi faolligi yo‘q" description="Smena qabul qiluvchi faollik kiritgach, eng faol ishchilar shu yerda ko‘rinadi." />}</PageSection>
    {summary.attention.length > 0 ? <PageSection title="E’tibor kerak"><InfoCard title="Operatsion ogohlantirishlar"><ul className="space-y-2 text-sm text-muted-foreground">{summary.attention.map((item) => <li key={item}>{item}</li>)}</ul></InfoCard></PageSection> : null}
  </div>;
}
