import { FileBarChart } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import type { ReportsOverview } from "@/lib/api/reports";

type QuickReport = ReportsOverview["quickReports"][number];

export function QuickReportShortcuts({ reports }: { reports: QuickReport[] }) {
  if (reports.length === 0) {
    return (
      <EmptyState
        title="Tezkor hisobotlar yo‘q"
        description="Backend quickReports bo‘sh ro‘yxat qaytardi."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {reports.map((report) => (
        <Link
          key={report.id}
          href={report.href}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 transition hover:bg-muted"
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
            <FileBarChart size={20} />
          </span>
          <span>
            <span className="block text-sm font-semibold">{report.label}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {report.description}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
