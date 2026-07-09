"use client";

import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
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
  destructive = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Dialog yopish"
        className="absolute inset-0"
        onClick={() => onOpenChange(false)}
      />
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="panel relative w-full max-w-md rounded-t-2xl p-5 shadow-2xl sm:rounded-xl sm:p-6"
      >
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
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
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
