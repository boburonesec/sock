"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
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
  /** Optional sticky footer actions (forms, save buttons). */
  footer?: React.ReactNode;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  side,
  className,
  footer,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const isSidePanel = Boolean(side);

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100]",
        isSidePanel
          ? "p-0"
          : "flex items-end justify-center p-0 sm:items-center sm:overflow-y-auto sm:p-4 sm:py-6",
      )}
    >
      {/* Separate layer so flex layout of the panel cannot sit under the backdrop hit-target. */}
      <button
        type="button"
        aria-label="Dialog yopish"
        className="absolute inset-0 z-0 bg-black/75 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={cn(
          "relative z-10 flex w-full flex-col overflow-hidden border bg-card text-card-foreground shadow-2xl",
          isSidePanel
            ? cn(
                // Full-width sheet on phones; side panel on larger screens
                "absolute inset-y-0 max-w-full sm:max-w-md",
                "pb-[env(safe-area-inset-bottom)]",
                side === "right" ? "right-0 border-l" : "left-0 border-r",
              )
            : cn(
                // Mobile: bottom sheet. Desktop: centered modal.
                "max-h-[min(92dvh,100%)] w-full max-w-full rounded-t-2xl border-b-0 sm:my-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-lg sm:rounded-xl sm:border",
                "pb-[env(safe-area-inset-bottom)]",
              ),
          // Feature-level max-w-* should not overflow phones
          "max-sm:!max-w-full",
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30 sm:hidden" />
        <header className="flex items-start justify-between gap-3 border-b p-4 sm:p-5">
          <div className="min-w-0">
            <h2 id="drawer-title" className="text-base font-semibold sm:text-lg">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg hover:bg-muted"
            aria-label="Yopish"
            onClick={() => onOpenChange(false)}
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-8 sm:p-5 sm:pb-6">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">{footer}</div>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
