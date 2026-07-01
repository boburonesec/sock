"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: React.ReactNode; side?: "right" | "left"; className?: string; }
export function Drawer({ open, onOpenChange, title, description, children, side = "right", className }: DrawerProps) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50"><button aria-label="Drawer yopish" className="absolute inset-0 bg-black/55" onClick={() => onOpenChange(false)} /><section role="dialog" aria-modal="true" aria-labelledby="drawer-title" className={cn("absolute inset-y-0 flex w-full max-w-md flex-col border-l bg-card shadow-2xl", side === "right" ? "right-0" : "left-0 border-l-0 border-r", className)}><header className="flex items-start justify-between gap-4 border-b p-5"><div><h2 id="drawer-title" className="font-semibold">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div><button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted" aria-label="Yopish" onClick={() => onOpenChange(false)}><X size={18}/></button></header><div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div></section></div>;
}
