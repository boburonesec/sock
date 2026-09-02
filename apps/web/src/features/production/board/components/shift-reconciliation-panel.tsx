"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { productionApi, type ProductionStageReference } from "@/lib/api/production";
import { queryKeys } from "@/lib/api/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function ShiftReconciliationPanel({ stages }: { stages: ProductionStageReference[] }) {
  const roles = useAuthStore((state) => state.roles);
  const permissions = useAuthStore((state) => state.permissions);
  const isManager = roles.includes("Manager");
  const canConfigure = isManager && permissions.includes("settings.write");
  const queryClient = useQueryClient();
  const recordsQuery = useQuery({ queryKey: queryKeys.production.shiftReconciliations(), queryFn: productionApi.getShiftReconciliations });
  const handoffQuery = useQuery({ queryKey: queryKeys.production.warehouseHandoffStage(), queryFn: productionApi.getWarehouseHandoffStage });
  const shiftsQuery = useQuery({ queryKey: ["production", "lookups", "work-shifts"], queryFn: productionApi.getLookupWorkShifts });
  const contextQuery = useQuery({ queryKey: ["production", "shift-context"], queryFn: productionApi.getShiftContext });
  const shifts = shiftsQuery.data?.data ?? [];
  const [workShiftId, setWorkShiftId] = useState("");
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [stageId, setStageId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { const assigned = contextQuery.data?.data.currentWorkShift; if (assigned) setWorkShiftId((current) => current || assigned.id); }, [contextQuery.data]);
  const readinessQuery = useQuery({ queryKey: ["production", "shift-readiness", workShiftId, workDate], queryFn: () => productionApi.getShiftReadiness(workShiftId, workDate), enabled: Boolean(workShiftId) });
  const refresh = async () => Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.production.shiftReconciliations() }), queryClient.invalidateQueries({ queryKey: queryKeys.production.warehouseHandoffStage() })]);
  const action = useMutation({ mutationFn: async (kind: "submit" | "accept" | "return") => {
    if (!workShiftId) throw new Error("Smenani tanlang.");
    if (kind === "submit") return productionApi.submitShiftReconciliation({ workShiftId, workDate });
    if (reason.trim().length < 3) throw new Error("Kamida 3 belgili sabab yozing.");
    return kind === "accept" ? productionApi.acceptShiftReconciliation({ workShiftId, workDate, reason }) : productionApi.returnShiftReconciliation({ workShiftId, workDate, reason });
  }, onSuccess: async (_, kind) => { setMessage(kind === "submit" ? "Smena topshirishga tayyor." : kind === "accept" ? "Smena qabul qilindi." : "Smena tuzatishga qaytarildi."); setReason(""); await refresh(); await readinessQuery.refetch(); }, onError: () => setMessage("Amal bajarilmadi. Quyidagi tayyorlik ro‘yxatini tekshiring.") });
  const configure = useMutation({ mutationFn: () => productionApi.configureWarehouseHandoffStage(stageId), onSuccess: async () => { setMessage("Omborga topshirish bosqichi saqlandi."); await refresh(); }, onError: (error) => setMessage(error instanceof Error ? error.message : "Sozlama saqlanmadi.") });
  const selected = (recordsQuery.data?.data ?? []).find((record) => record.workShiftId === workShiftId && record.workDate.slice(0, 10) === workDate);

  return <div className="space-y-4 rounded-xl border border-border/70 bg-card/40 p-4">
    <div><h3 className="font-semibold">Smena yakuni</h3><p className="text-sm text-muted-foreground">Ochiq ishlar va omborga topshirilmagan mahsulot bo‘lsa smena qabul qilinmaydi.</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><select className="h-11 rounded-md border bg-background px-3" value={workShiftId} onChange={(event) => setWorkShiftId(event.target.value)}><option value="">Smenani tanlang</option>{shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}</select><input className="h-11 rounded-md border bg-background px-3" type="date" value={workDate} onChange={(event) => setWorkDate(event.target.value)} /></div>
    {!contextQuery.isLoading && !contextQuery.data?.data.currentWorkShift ? <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">{contextQuery.data?.data.message}</p> : null}
    <p className="text-sm">Holat: <strong>{{ OPEN: "Ochiq", READY_FOR_HANDOVER: "Topshirishga tayyor", ACCEPTED: "Qabul qilingan" }[selected?.status ?? "OPEN"]}</strong></p>
    {workShiftId ? <div className="grid gap-3 md:grid-cols-3">
      {(["BLOCKER", "WARNING", "READY"] as const).map((status) => <div key={status} className="rounded-lg border p-3"><h4 className="mb-2 font-medium">{{ BLOCKER: "To‘xtatadigan muammolar", WARNING: "Ogohlantirishlar", READY: "Tayyor" }[status]}</h4><div className="space-y-2">{(readinessQuery.data?.data.checks ?? []).filter((item) => item.status === status).map((item) => <div key={item.code} className="text-sm"><p className="font-medium">{item.label}</p><p className="text-muted-foreground">{item.detail}</p>{status !== "READY" ? <p className="mt-1">Keyingi qadam: {item.action}</p> : null}</div>)}{!readinessQuery.isLoading && !(readinessQuery.data?.data.checks ?? []).some((item) => item.status === status) ? <p className="text-sm text-muted-foreground">Yo‘q</p> : null}</div></div>)}
    </div> : null}
    {isManager ? <textarea className="min-h-20 w-full rounded-md border bg-background p-3" placeholder="Ogohlantirishni qabul qilish yoki qaytarish sababi" value={reason} onChange={(event) => setReason(event.target.value)} /> : null}
    <div className="flex flex-wrap gap-2"><Button disabled={action.isPending || selected?.status === "ACCEPTED" || Boolean(readinessQuery.data?.data.blockers.length)} onClick={() => action.mutate("submit")}>Topshirishga tayyor</Button>{isManager ? <><Button disabled={action.isPending || selected?.status !== "READY_FOR_HANDOVER" || Boolean(readinessQuery.data?.data.blockers.length)} onClick={() => action.mutate("accept")}>Qabul qilish</Button><Button variant="outline" disabled={action.isPending || selected?.status !== "READY_FOR_HANDOVER"} onClick={() => action.mutate("return")}>Tuzatishga qaytarish</Button></> : null}</div>
    <div className="text-sm">Omborga topshirish bosqichi: <strong>{handoffQuery.data?.data?.name ?? "Sozlanmagan"}</strong></div>
    {canConfigure ? <div className="flex gap-2"><select className="h-10 flex-1 rounded-md border bg-background px-3" value={stageId} onChange={(event) => setStageId(event.target.value)}><option value="">Bosqichni tanlang</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select><Button variant="outline" disabled={!stageId || configure.isPending} onClick={() => configure.mutate()}>Saqlash</Button></div> : null}
    {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
  </div>;
}
