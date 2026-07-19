"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  isPending?: boolean;
  errorMessage?: string | null;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Tasdiqlash",
  cancelLabel = "Bekor qilish",
  onConfirm,
  isPending = false,
  errorMessage,
  destructive = false,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmingRef = useRef(false);
  const interactionLocked = isPending || isConfirming;

  if (!open) return null;

  const confirm = async () => {
    if (interactionLocked || confirmingRef.current) return;

    confirmingRef.current = true;
    setIsConfirming(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // The owning mutation renders its API error and keeps the dialog open.
    } finally {
      confirmingRef.current = false;
      setIsConfirming(false);
    }
  };

  return (
    // Must sit above Drawer (z-[100]) so confirm actions remain clickable from drawers.
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Dialog yopish"
        className="absolute inset-0 z-0"
        disabled={interactionLocked}
        onClick={() => onOpenChange(false)}
      />
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="panel relative z-10 w-full max-w-md rounded-t-2xl p-5 shadow-2xl sm:rounded-xl sm:p-6"
      >
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {errorMessage ? (
          <p role="alert" className="mt-3 text-sm text-rose-400">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={interactionLocked}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className={
              destructive
                ? "w-full bg-rose-600 hover:bg-rose-700 sm:w-auto"
                : "w-full sm:w-auto"
            }
            disabled={interactionLocked}
            onClick={() => void confirm()}
          >
            {interactionLocked ? "Bajarilmoqda..." : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
