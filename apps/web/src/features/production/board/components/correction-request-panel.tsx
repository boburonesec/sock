"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { recoveryApi, type CorrectionDomain } from "@/lib/api/recovery";
import { useAuthStore } from "@/stores/auth-store";
import { formatDateTimeForUser } from "@/lib/format";

export function CorrectionRequestButton({ domain, sourceRecordId, title, details }: { domain: CorrectionDomain; sourceRecordId: string; title: string; details: Array<{ label: string; value: string }> }) {
  const [open, setOpen] = useState(false); const [reason, setReason] = useState(""); const [result, setResult] = useState<string | null>(null); const client = useQueryClient();
  const mutation = useMutation({ mutationFn: () => recoveryApi.createCorrectionRequest({ domain, sourceRecordId, reason }), onSuccess: async (response) => { setResult(`So‘rov yuborildi. Holat: Manager ko‘rib chiqishini kutmoqda. Raqam: ${response.data.id.slice(0, 8)}`); setReason(""); await client.invalidateQueries({ queryKey: ["recovery", "correction-requests"] }); } });
  return <>{<Button className="h-9 px-3 text-sm" variant="outline" onClick={() => { setOpen(true); setResult(null); }}>Xatoni bildirish</Button>}{open ? <div role="dialog" aria-modal="true" className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4"><div className="w-full max-w-lg space-y-4 rounded-xl border bg-card p-5"><div><h3 className="font-semibold">Xatoni bildirish</h3><p className="text-sm text-muted-foreground">Asl yozuv o‘zgarmaydi. So‘rovni Manager ko‘rib chiqadi.</p></div><div className="rounded-lg border p-3"><p className="font-medium">{title}</p>{details.map((item) => <p key={item.label} className="text-sm"><span className="text-muted-foreground">{item.label}:</span> {item.value}</p>)}</div>{result ? <p role="status" className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">{result}</p> : <textarea aria-label="Xato sababi" className="min-h-24 w-full rounded-md border bg-background p-3" placeholder="Nima xato va qanday bo‘lishi kerak?" value={reason} onChange={(e) => setReason(e.target.value)} />}{mutation.isError ? <p className="text-sm text-rose-400">So‘rov yuborilmadi. Qayta urinib ko‘ring.</p> : null}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Yopish</Button>{!result ? <Button disabled={reason.trim().length < 3 || mutation.isPending} onClick={() => mutation.mutate()}>Managerga yuborish</Button> : null}</div></div></div> : null}</>;
}

export function CorrectionManagerQueue() {
  const permissions = useAuthStore((s) => s.permissions);
  const canApprove = permissions.includes("production.approve") || permissions.includes("expense.approve");
  const [notes, setNotes] = useState<Record<string,string>>({});
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["recovery", "correction-requests"], queryFn: recoveryApi.getCorrectionRequests, enabled: canApprove });
  const resolve = useMutation({ mutationFn: ({ id, note }: { id: string; note: string }) => recoveryApi.resolveCorrectionRequest(id, note), onSuccess: () => client.invalidateQueries({ queryKey: ["recovery", "correction-requests"] }) });
  if (!canApprove) return null;
  const domain = { PRODUCTION_MOVEMENT: "Bosqich o‘tkazishi", WORKER_ACTIVITY: "Ishchi faoliyati", SUPPLIER_PAYMENT: "Yetkazib beruvchi to‘lovi" };
  return <div className="space-y-3 rounded-xl border p-4"><div><h3 className="font-semibold">Tuzatish so‘rovlari</h3><p className="text-sm text-muted-foreground">Asl yozuvlar o‘zgarmaydi; tekshiruv natijasini izoh bilan yoping.</p></div>{(query.data?.data ?? []).map((item) => <article key={item.id} className="rounded-lg border p-3"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-medium">{domain[item.domain]} · {item.source.title}</p><p className="text-sm text-muted-foreground">So‘ragan: {item.requester?.name ?? "Noma’lum"} · {formatDateTimeForUser(new Date(item.requestedAt))}</p></div><strong>{item.status === "OPEN" ? "Ko‘rib chiqilmoqda" : "Yopilgan"}</strong></div><p className="mt-2 text-sm">Sabab: {item.reason}</p>{item.status === "OPEN" ? <div className="mt-3 flex gap-2"><input className="h-10 flex-1 rounded-md border bg-background px-3" placeholder="Tekshiruv natijasi" value={notes[item.id] ?? ""} onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })}/><Button disabled={(notes[item.id]?.trim().length ?? 0) < 3 || resolve.isPending} onClick={() => resolve.mutate({ id: item.id, note: notes[item.id] })}>So‘rovni yopish</Button></div> : <p className="mt-2 text-sm">Natija: {item.resolutionNote}</p>}</article>)}{!query.isLoading && !(query.data?.data.length) ? <p className="text-sm text-muted-foreground">So‘rovlar yo‘q.</p> : null}</div>;
}
