"use client";

import { useState } from "react";
import { Box, Layers } from "lucide-react";
import { KpiCard } from "@/components/cards/kpi-card";
import { StatCard } from "@/components/cards/stat-card";
import { InfoCard } from "@/components/cards/info-card";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartContainer } from "@/components/charts/chart-container";
import { DataTable, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { PriorityBadge } from "@/components/data-display/priority-badge";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { FilterBar } from "@/components/filters/filter-bar";
import { SearchInput } from "@/components/filters/search-input";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { Drawer } from "@/components/overlays/drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export function DesignSystemExamples() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  return <div className="space-y-10"><Breadcrumbs items={[{ label: "Asos", href: "/design-system" }, { label: "Komponent namunalari" }]} />
    <section className="grid gap-4 md:grid-cols-3"><KpiCard label="KPI karta" value="—" description="Qayta ishlatiladigan ko‘rsatkich kartasi" /><StatCard label="Statistika karta" value="—" detail="Ixtiyoriy belgi va izoh" icon={<Layers size={20}/>} /><InfoCard title="Ma’lumot kartasi" description="Qayta ishlatiladigan kontent yuzasi"><p className="text-sm text-muted-foreground">Kelajakdagi ekran kontenti shu yerda turishi mumkin.</p></InfoCard></section>
    <section className="grid gap-4 lg:grid-cols-2"><ChartCard title="Grafik kartasi" description="Ma’lumotsiz grafik konteyneri"><ChartContainer label="Bo‘sh grafik maydoni"><div className="grid h-full place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">Grafik kontenti joyi</div></ChartContainer></ChartCard><InfoCard title="Belgilar"><div className="flex flex-wrap gap-2"><StatusBadge tone="neutral">Oddiy</StatusBadge><StatusBadge tone="success">Yaxshi</StatusBadge><StatusBadge tone="warning">E’tibor</StatusBadge><StatusBadge tone="danger">Xavf</StatusBadge><PriorityBadge priority="low"/><PriorityBadge priority="high"/><PriorityBadge priority="critical"/></div></InfoCard></section>
    <section><FilterBar><SearchInput placeholder="Qidiruv namunasi" containerClassName="w-full sm:w-80"/><Button variant="outline">Filter</Button></FilterBar><div className="mt-4"><DataTable label="Bo‘sh jadval namunasi"><DataTableHead><DataTableRow><DataTableHeader>Ustun A</DataTableHeader><DataTableHeader>Ustun B</DataTableHeader></DataTableRow></DataTableHead><tbody><EmptyTableState colSpan={2}/></tbody></DataTable></div></section>
    <section className="grid gap-4 lg:grid-cols-2"><EmptyState/><LoadingState className="panel"/></section>
    <ErrorState title="Xatolik holati" description="Ixtiyoriy amal bilan qayta ishlatiladigan xatolik bloki." action={<Button variant="outline">Qayta urinish</Button>} />
    <section className="flex flex-wrap gap-3"><Button onClick={() => setDrawerOpen(true)}>Yon oynani ochish</Button><Button variant="outline" onClick={() => setDialogOpen(true)}>Tasdiqlash oynasi</Button></section>
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Yon oyna" description="Qayta ishlatiladigan overlay elementi"><p className="text-sm text-muted-foreground">Yon oyna kontenti joyi.</p></Drawer>
    <ConfirmDialog open={dialogOpen} onOpenChange={setDialogOpen} title="Tasdiqlash oynasi" description="Qayta ishlatiladigan tasdiqlash oynasi." onConfirm={() => undefined}/>
  </div>;
}
