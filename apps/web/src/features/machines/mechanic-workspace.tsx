"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { machinesApi } from "@/lib/api/machines";
import { useAuthStore } from "@/stores/auth-store";

export function MechanicWorkspace() {
  const qc = useQueryClient();
  const tasks = useQuery({ queryKey: ["mechanic", "tasks"], queryFn: machinesApi.tasks });
  const rounds = useQuery({ queryKey: ["mechanic", "rounds"], queryFn: machinesApi.rounds });
  const issues = useQuery({ queryKey: ["mechanic", "issues"], queryFn: machinesApi.issues });
  const [values, setValues] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const inFlight = useRef(new Set<string>());
  const canHold = useAuthStore((state) => state.permissions).includes("production.write");
  const submit = useMutation({ mutationFn: ({ id, metrics }: { id: string; metrics: Array<{ metricId: string; value: number }> }) => machinesApi.submitMeasurements(id, metrics) });
  const recheck = useMutation({ mutationFn: ({ id, metrics }: { id: string; metrics: Array<{ metricId: string; value: number }> }) => machinesApi.recheckIssue(id, metrics) });
  const updateTask = useMutation({ mutationFn: ({ id, status, resolution }: { id: string; status: string; resolution?: string }) => machinesApi.updateTask(id, { status, resolution }) });
  const hold = useMutation({ mutationFn: machinesApi.holdIssueRun });
  const error = [submit.error, recheck.error, updateTask.error, hold.error].find(Boolean);

  const runOnce = async (key: string, action: () => Promise<unknown>, message: string, afterSuccess?: () => void) => {
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key); setSuccess("");
    try {
      await action();
      await qc.invalidateQueries({ queryKey: ["mechanic"] });
      afterSuccess?.(); setSuccess(message);
    } catch { /* mutation.error contains the understandable API message */ }
    finally { inFlight.current.delete(key); }
  };

  return <div className="space-y-6">
    <PageHeader title="Mexanik ish maydoni" description="Bugungi stanoklar, tasklar va uch martalik o‘lchov nazorati" />
    {success && <p role="status" className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</p>}
    {error instanceof Error && <p role="alert" className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error.message}</p>}

    <section><h2 className="mb-3 text-lg font-semibold">Tasklar</h2><div className="grid gap-3 md:grid-cols-2">
      {tasks.data?.data.map((task) => <article key={task.id} className="rounded-xl border p-4">
        <p className="font-medium">{task.machine.code} · {task.type}</p><p className="text-sm text-muted-foreground">{task.description}</p><p className="mt-2 text-xs">{task.priority} · {task.status}</p>
        {task.status === "OPEN" && <Button className="mt-3 w-full" variant="outline" disabled={updateTask.isPending} onClick={() => void runOnce(`task:${task.id}`, () => updateTask.mutateAsync({ id: task.id, status: "IN_PROGRESS" }), "Task boshlandi.")}>Ishni boshlash</Button>}
        {task.status === "IN_PROGRESS" && <form className="mt-3 space-y-2" onSubmit={(event: FormEvent) => { event.preventDefault(); void runOnce(`task:${task.id}`, () => updateTask.mutateAsync({ id: task.id, status: "COMPLETED", resolution: values[`task:${task.id}`] }), "Task yakunlandi.", () => setValues((current) => ({ ...current, [`task:${task.id}`]: "" }))); }}>
          <Input required disabled={updateTask.isPending} placeholder="Bajarilgan ish natijasi" value={values[`task:${task.id}`] ?? ""} onChange={(event) => setValues({ ...values, [`task:${task.id}`]: event.target.value })} />
          <Button className="w-full" disabled={updateTask.isPending}>Taskni yakunlash</Button>
        </form>}
        {task.status === "COMPLETED" && task.resolution && <p className="mt-2 text-sm text-emerald-300">Natija: {task.resolution}</p>}
      </article>)}
    </div></section>

    <section><h2 className="mb-3 text-lg font-semibold">Kutilayotgan o‘lchovlar</h2><div className="space-y-4">
      {rounds.data?.data.filter((round) => round.status === "PENDING" || round.status === "IN_PROGRESS").map((round) => <form key={round.id} className="rounded-xl border p-4" onSubmit={(event) => { event.preventDefault(); void runOnce(`round:${round.id}`, () => submit.mutateAsync({ id: round.id, metrics: round.specification.metrics.map((metric) => ({ metricId: metric.id, value: Number(values[`${round.id}:${metric.id}`]) })) }), "O‘lchov saqlandi."); }}>
        <p className="font-medium">{round.machine.code} · {round.productionRun.productVariant.product.name}</p><p className="mb-3 text-sm text-muted-foreground">{new Date(round.scheduledAt).toLocaleString("uz-UZ")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{round.specification.metrics.map((metric) => <label key={metric.id} className="text-sm">{metric.name} ({metric.unit})<Input type="number" step="0.001" required disabled={submit.isPending} value={values[`${round.id}:${metric.id}`] ?? ""} onChange={(event) => setValues({ ...values, [`${round.id}:${metric.id}`]: event.target.value })} /><span className="text-xs text-muted-foreground">Norma {metric.min}–{metric.max}, maqsad {metric.target}</span></label>)}</div>
        <Button className="mt-4" disabled={submit.isPending}>O‘lchovni saqlash</Button>
      </form>)}
    </div></section>

    <section><h2 className="mb-3 text-lg font-semibold">Attention</h2>{issues.data?.data.map((issue) => <form key={issue.id} className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4" onSubmit={(event) => { event.preventDefault(); void runOnce(`issue:${issue.id}`, () => recheck.mutateAsync({ id: issue.id, metrics: issue.inspectionRound.specification.metrics.map((metric) => ({ metricId: metric.id, value: Number(values[`issue:${issue.id}:${metric.id}`]) })) }), "Qayta o‘lchov saqlandi."); }}>
      <p className="font-medium">{issue.machine.code} · qayta tekshiruv {new Date(issue.recheckDueAt).toLocaleTimeString("uz-UZ")}</p><p className="mb-3 text-sm text-muted-foreground">Holat: {issue.status}</p>
      <div className="grid gap-2 sm:grid-cols-3">{issue.inspectionRound.specification.metrics.map((metric) => <label key={metric.id} className="text-sm">{metric.name} ({metric.unit})<Input type="number" step="0.001" required disabled={recheck.isPending} value={values[`issue:${issue.id}:${metric.id}`] ?? ""} onChange={(event) => setValues({ ...values, [`issue:${issue.id}:${metric.id}`]: event.target.value })} /></label>)}</div>
      <div className="mt-3 flex gap-2"><Button disabled={recheck.isPending}>Qayta o‘lchash</Button>{canHold && <Button type="button" variant="outline" disabled={hold.isPending} onClick={() => void runOnce(`hold:${issue.id}`, () => hold.mutateAsync(issue.id), "Production run HOLD holatiga o‘tkazildi.")}>Runni HOLD qilish</Button>}</div>
    </form>)}</section>
  </div>;
}
