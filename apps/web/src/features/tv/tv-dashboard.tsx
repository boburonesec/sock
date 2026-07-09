"use client";

import { AlertTriangle, CircleAlert, Info, RefreshCw } from "lucide-react";
import type {
  FactoryTvAlertTone,
  FactoryTvStageStatus,
} from "@/lib/api/dashboard";
import { useFactoryTvSummary } from "./use-factory-tv-summary";

const stageStyles: Record<FactoryTvStageStatus, string> = {
  NORMAL: "border-emerald-500/45 bg-emerald-500/10 text-emerald-400",
  ATTENTION: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  HIGH: "border-rose-500/55 bg-rose-500/10 text-rose-400",
};

const stageLabels: Record<FactoryTvStageStatus, string> = {
  NORMAL: "Me’yorda",
  ATTENTION: "Kuzatuvda",
  HIGH: "Yuqori qoldiq",
};

const alertIcons: Record<FactoryTvAlertTone, typeof Info> = {
  INFO: Info,
  WARNING: AlertTriangle,
  CRITICAL: CircleAlert,
};

const alertStyles: Record<FactoryTvAlertTone, string> = {
  INFO: "border-blue-500/45 bg-blue-500/10 text-blue-400",
  WARNING: "border-amber-500/45 bg-amber-500/10 text-amber-400",
  CRITICAL: "border-rose-500/45 bg-rose-500/10 text-rose-400",
};

export function TvDashboard() {
  const { data, error, isError, isPending, refetch } = useFactoryTvSummary();

  if (isPending) {
    return (
      <main className="dark grid min-h-screen place-items-center bg-background p-8 text-foreground">
        <div className="text-center">
          <span className="mx-auto block h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="mt-6 text-3xl font-black">Fabrika TV yuklanmoqda...</p>
          <p className="mt-2 text-xl text-muted-foreground">Paypoq OS</p>
        </div>
      </main>
    );
  }

  if (isError || !data?.data) {
    return (
      <main className="dark grid min-h-screen place-items-center bg-background p-8 text-foreground">
        <div className="max-w-3xl rounded-3xl border border-rose-500/45 bg-rose-500/10 p-10 text-center text-rose-300">
          <CircleAlert className="mx-auto" size={64} />
          <h1 className="mt-6 text-4xl font-black">TV panel yuklanmadi</h1>
          <p className="mt-4 text-xl opacity-90">
            {error instanceof Error
              ? error.message
              : "Fabrika TV ma’lumotlarini olishda xatolik yuz berdi."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-rose-300/50 px-6 py-4 text-xl font-bold transition hover:bg-rose-300/10"
          >
            <RefreshCw size={24} />
            Qayta urinish
          </button>
        </div>
      </main>
    );
  }

  const summary = data.data;
  const kpis = [
    {
      label: "Bugungi ishlab chiqarish",
      value: summary.kpis.todayProduction,
      unit: "dona",
      tone: "border-emerald-500/40 bg-emerald-500/10",
    },
    {
      label: "Jarayondagi mahsulotlar",
      value: summary.kpis.totalInProgress,
      unit: "dona",
      tone: "border-blue-500/40 bg-blue-500/10",
    },
    {
      label: "Omborga kirgan mahsulotlar",
      value: summary.kpis.finishedProductQuantity,
      unit: "dona",
      tone: "border-violet-500/40 bg-violet-500/10",
    },
    {
      label: "Aktiv ishchilar",
      value: summary.kpis.activeWorkers,
      unit: "nafar",
      tone: "border-amber-500/40 bg-amber-500/10",
    },
  ];

  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto min-h-screen max-w-[2200px] p-6 lg:p-10">
        <header className="flex items-end justify-between border-b border-border pb-6">
          <div>
            <p className="text-2xl font-black tracking-tight text-primary lg:text-4xl">
              Paypoq OS
            </p>
            <h1 className="mt-2 text-xl font-semibold lg:text-3xl">
              {summary.factoryName}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold lg:text-2xl">
              {summary.currentDateLabel}
            </p>
            <p className="mt-1 text-sm text-muted-foreground lg:text-lg">
              {summary.shiftLabel}
            </p>
          </div>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <article key={kpi.label} className={`rounded-2xl border p-6 ${kpi.tone}`}>
              <p className="text-base font-medium text-muted-foreground lg:text-xl">
                {kpi.label}
              </p>
              <p className="mt-4 text-4xl font-black tracking-tight lg:text-6xl">
                {kpi.value}
              </p>
              <p className="mt-1 text-lg text-muted-foreground lg:text-2xl">
                {kpi.unit}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold lg:text-4xl">Bosqich qoldiqlari</h2>
            <p className="text-base text-muted-foreground lg:text-xl">
              Hozirgi qoldiq
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {summary.stageTotals.map((stage) => (
              <article
                key={stage.stageId}
                className={`rounded-2xl border p-5 ${stageStyles[stage.status]}`}
              >
                <p className="text-lg font-semibold lg:text-2xl">{stage.stageName}</p>
                <p className="mt-6 text-4xl font-black tracking-tight lg:text-5xl">
                  {stage.quantity}
                </p>
                <p className="mt-2 text-sm font-medium uppercase tracking-wide opacity-80 lg:text-base">
                  {stageLabels[stage.status]}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-5">
          <div className="rounded-2xl border border-border bg-card p-6 xl:col-span-3">
            <h2 className="text-2xl font-bold lg:text-4xl">
              Bugungi eng faol ishchilar
            </h2>
            <div className="mt-5 overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-[80px_1.4fr_1fr_1fr] bg-muted px-5 py-4 text-sm font-semibold text-muted-foreground lg:text-lg">
                <span>O‘rin</span>
                <span>Ishchi</span>
                <span>Bosqich</span>
                <span>Miqdor</span>
              </div>
              {summary.topWorkers.length === 0 ? (
                <div className="border-t border-border px-5 py-12 text-center text-xl text-muted-foreground">
                  Bugun ishchi faolligi hali qayd qilinmagan.
                </div>
              ) : (
                summary.topWorkers.map((worker) => (
                  <div
                    key={`${worker.rank}-${worker.employeeId}-${worker.stageName}`}
                    className="grid grid-cols-[80px_1.4fr_1fr_1fr] border-t border-border px-5 py-4 text-base lg:text-xl"
                  >
                    <span className="font-black text-primary">#{worker.rank}</span>
                    <span className="font-semibold">{worker.employeeName}</span>
                    <span>{worker.stageName}</span>
                    <span className="font-bold">{worker.quantity} dona</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 xl:col-span-2">
            <h2 className="text-2xl font-bold lg:text-4xl">Ogohlantirishlar</h2>
            <div className="mt-5 space-y-3">
              {summary.alerts.length === 0 ? (
                <div className="rounded-xl border border-emerald-500/45 bg-emerald-500/10 p-5 text-emerald-400">
                  <p className="text-xl font-bold">Ogohlantirish yo‘q</p>
                  <p className="mt-2 text-base opacity-85">
                    Tizim hozircha e’tibor talab qiladigan holat qaytarmadi.
                  </p>
                </div>
              ) : (
                summary.alerts.map((alert) => {
                  const Icon = alertIcons[alert.tone];

                  return (
                    <div
                      key={alert.id}
                      className={`rounded-xl border p-4 ${alertStyles[alert.tone]}`}
                    >
                      <div className="flex gap-3">
                        <Icon className="shrink-0" size={24} />
                        <div>
                          <p className="font-semibold lg:text-lg">{alert.title}</p>
                          <p className="mt-1 text-sm opacity-85 lg:text-base">
                            {alert.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
