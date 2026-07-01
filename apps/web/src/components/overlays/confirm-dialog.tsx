"use client";

import { Button } from "@/components/ui/button";

interface ConfirmDialogProps { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; confirmLabel?: string; cancelLabel?: string; onConfirm: () => void; destructive?: boolean; }
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Tasdiqlash", cancelLabel = "Bekor qilish", onConfirm, destructive = false }: ConfirmDialogProps) {
  if (!open) return null;
  const confirm = () => { onConfirm(); onOpenChange(false); };
  return <div className="fixed inset-0 z-50 grid place-items-center p-4"><button aria-label="Dialog yopish" className="absolute inset-0 bg-black/55" onClick={() => onOpenChange(false)} /><section role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="panel relative w-full max-w-md p-6 shadow-2xl"><h2 id="confirm-title" className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{description}</p><div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => onOpenChange(false)}>{cancelLabel}</Button><Button className={destructive ? "bg-rose-600 hover:bg-rose-700" : undefined} onClick={confirm}>{confirmLabel}</Button></div></section></div>;
}
