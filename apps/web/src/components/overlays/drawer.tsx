"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
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

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm",
        isSidePanel ? "p-0" : "flex items-center justify-center overflow-y-auto p-4 py-6",
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
            : "my-auto max-h-[calc(100dvh-3rem)] max-w-lg rounded-xl",
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
    </div>,
    document.body,
  );
}
