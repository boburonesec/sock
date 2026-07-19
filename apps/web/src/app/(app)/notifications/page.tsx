"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { notificationsApi } from "@/lib/api/notifications";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: notificationsApi.list });
  const read = useMutation({ mutationFn: notificationsApi.read });
  const inFlight = useRef(new Set<string>());
  const [success, setSuccess] = useState("");

  const markRead = async (id: string) => {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id); setSuccess("");
    try {
      await read.mutateAsync(id);
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      setSuccess("Bildirishnoma o‘qildi deb belgilandi.");
    } catch { /* mutation.error is rendered without discarding inbox state */ }
    finally { inFlight.current.delete(id); }
  };

  return <div className="space-y-5">
    <PageHeader title="Bildirishnomalar" description="In-app inbox — Telegram yetkazish ishlamasa ham bu ro‘yxat source of truth" />
    {success && <p role="status" className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</p>}
    {read.error instanceof Error && <p role="alert" className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{read.error.message}</p>}
    <div className="space-y-3">
      {notifications.isPending && <p>Yuklanmoqda...</p>}
      {notifications.data?.data.length === 0 && <p className="text-muted-foreground">Hozircha bildirishnoma yo‘q.</p>}
      {notifications.data?.data.map((item) => <article key={item.id} className={`rounded-xl border p-4 ${item.readAt ? "opacity-70" : "border-primary/40"}`}>
        <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.body}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("uz-UZ")}</p></div>
          {!item.readAt && <Button variant="outline" disabled={read.isPending && inFlight.current.has(item.id)} onClick={() => void markRead(item.id)}>O‘qildi</Button>}
        </div>
      </article>)}
    </div>
  </div>;
}
