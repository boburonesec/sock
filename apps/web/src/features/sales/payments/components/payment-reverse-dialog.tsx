"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PaymentReverseDialogProps {
  open: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function PaymentReverseDialog({
  open,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onConfirm,
}: PaymentReverseDialogProps) {
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <button
        type="button"
        aria-label="Dialog yopish"
        className="absolute inset-0 bg-black/55"
        onClick={() => onOpenChange(false)}
      />
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reverse-payment-title"
        className="panel relative w-full max-w-lg p-6 shadow-2xl"
      >
        <h2 id="reverse-payment-title" className="text-lg font-semibold">
          To‘lovni bekor qilish
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Bu to‘lov bekor qilinadi. Mijoz qarzi va buyurtma to‘lov holati
          tizim tomonidan qayta hisoblanadi. Yetkazilgan yoki yopilgan
          buyurtmalarga bog‘langan to‘lovlar bloklanadi.
        </p>

        <label className="mt-5 block text-sm font-medium" htmlFor="reverseReason">
          Sabab <span className="text-rose-400">*</span>
        </label>
        <Textarea
          id="reverseReason"
          className="mt-2"
          value={reason}
          disabled={isSubmitting}
          placeholder="Masalan: to‘lov noto‘g‘ri buyurtmaga taqsimlangan"
          onChange={(event) => setReason(event.target.value)}
        />

        {errorMessage ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Bekor qilish
          </Button>
          <Button
            type="button"
            className="bg-rose-600 hover:bg-rose-700"
            disabled={isSubmitting || trimmedReason.length === 0}
            onClick={() => onConfirm(trimmedReason)}
          >
            {isSubmitting ? "Bekor qilinmoqda..." : "To‘lovni bekor qilish"}
          </Button>
        </div>
      </section>
    </div>
  );
}
