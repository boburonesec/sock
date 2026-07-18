"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { notificationsApi } from "@/lib/api/notifications";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: notificationsApi.list });
  const read = useMutation({ mutationFn: notificationsApi.read, onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }) });
  return <div className="space-y-5"><PageHeader title="Bildirishnomalar" description="In-app inbox — Telegram yetkazish ishlamasa ham bu ro‘yxat source of truth" />
    <div className="space-y-3">{notifications.isPending && <p>Yuklanmoqda...</p>}{notifications.data?.data.length === 0 && <p className="text-muted-foreground">Hozircha bildirishnoma yo‘q.</p>}{notifications.data?.data.map((item) => <article key={item.id} className={`rounded-xl border p-4 ${item.readAt ? "opacity-70" : "border-primary/40"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.body}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("uz-UZ")}</p></div>{!item.readAt && <Button variant="outline" onClick={() => read.mutate(item.id)}>O‘qildi</Button>}</div></article>)}</div>
  </div>;
}
