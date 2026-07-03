"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  side?: "right" | "left";
  className?: string;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  side,
  className,
}: DrawerProps) {
  if (!open) return null;

  const isSidePanel = Boolean(side);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm",
        isSidePanel ? "p-0" : "grid place-items-center",
      )}
    >
      <button
        aria-label="Dialog yopish"
        className="absolute inset-0"
        onClick={() => onOpenChange(false)}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={cn(
          "relative flex w-full flex-col overflow-hidden border bg-card text-card-foreground shadow-2xl",
          isSidePanel
            ? cn(
                "absolute inset-y-0 max-w-md rounded-none",
                side === "right" ? "right-0 border-l" : "left-0 border-r",
              )
            : "max-h-[calc(100vh-2rem)] max-w-lg rounded-xl",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b p-5">
          <div>
            <h2 id="drawer-title" className="font-semibold">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-muted"
            aria-label="Yopish"
            onClick={() => onOpenChange(false)}
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  );
}
