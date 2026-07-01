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
  return <div className="space-y-10"><Breadcrumbs items={[{ label: "Foundation", href: "/design-system" }, { label: "Component examples" }]} />
    <section className="grid gap-4 md:grid-cols-3"><KpiCard label="KPI Card" value="—" description="Reusable metric primitive" /><StatCard label="Stat Card" value="—" detail="Optional icon and detail" icon={<Layers size={20}/>} /><InfoCard title="Info Card" description="Composable content surface"><p className="text-sm text-muted-foreground">Any future screen content can live here.</p></InfoCard></section>
    <section className="grid gap-4 lg:grid-cols-2"><ChartCard title="Chart Card" description="Chart wrapper without a dataset"><ChartContainer label="Empty chart area"><div className="grid h-full place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">Chart content slot</div></ChartContainer></ChartCard><InfoCard title="Badges"><div className="flex flex-wrap gap-2"><StatusBadge tone="neutral">Neutral</StatusBadge><StatusBadge tone="success">Success</StatusBadge><StatusBadge tone="warning">Warning</StatusBadge><StatusBadge tone="danger">Danger</StatusBadge><PriorityBadge priority="low"/><PriorityBadge priority="high"/><PriorityBadge priority="critical"/></div></InfoCard></section>
    <section><FilterBar><SearchInput placeholder="Search input example" containerClassName="w-full sm:w-80"/><Button variant="outline">Filter action</Button></FilterBar><div className="mt-4"><DataTable label="Empty table example"><DataTableHead><DataTableRow><DataTableHeader>Column A</DataTableHeader><DataTableHeader>Column B</DataTableHeader></DataTableRow></DataTableHead><tbody><EmptyTableState colSpan={2}/></tbody></DataTable></div></section>
    <section className="grid gap-4 lg:grid-cols-2"><EmptyState/><LoadingState className="panel"/></section>
    <ErrorState title="Error State" description="Reusable error feedback with optional action." action={<Button variant="outline">Retry</Button>} />
    <section className="flex flex-wrap gap-3"><Button onClick={() => setDrawerOpen(true)}>Open Drawer</Button><Button variant="outline" onClick={() => setDialogOpen(true)}>Open Confirm Dialog</Button></section>
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Drawer" description="Reusable overlay primitive"><p className="text-sm text-muted-foreground">Drawer content slot.</p></Drawer>
    <ConfirmDialog open={dialogOpen} onOpenChange={setDialogOpen} title="Confirm Dialog" description="Reusable confirmation overlay." onConfirm={() => undefined}/>
  </div>;
}
