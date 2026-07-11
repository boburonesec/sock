"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DeliverSalesOrderPayload, SalesOrder } from "@/lib/api/sales";

interface DeliveryConfirmDrawerProps {
  order: SalesOrder | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: DeliverSalesOrderPayload) => Promise<void>;
}

/**
 * Delivery is independent of client payment.
 * Optional logistics cost is factory expense (Transport), not client debt.
 */
export function DeliveryConfirmDrawer({
  order,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onConfirm,
}: DeliveryConfirmDrawerProps) {
  const open = Boolean(order);
  const [deliveryCost, setDeliveryCost] = useState("");
  const [deliveryCostNote, setDeliveryCostNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDeliveryCost("");
      setDeliveryCostNote("");
      setLocalError(null);
    }
  }, [open, order?.id]);

  if (!order) return null;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Yetkazildi qilish"
      description={`${order.orderNumber} · ${order.client.name}`}
      className="max-w-lg"
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setLocalError(null);
          const trimmed = deliveryCost.trim();
          if (trimmed.length > 0) {
            const n = Number(trimmed);
            if (!Number.isFinite(n) || n <= 0) {
              setLocalError("Logistika summasi musbat bo‘lishi kerak.");
              return;
            }
          }
          await onConfirm({
            deliveryCost: trimmed.length > 0 ? trimmed : null,
            deliveryCostNote: deliveryCostNote.trim() || null,
          });
        }}
      >
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Mahsulot <strong>Finished Products</strong> omboridan chiqadi. Mijoz
          to‘lovi shart emas — qarz alohida yuritiladi. Bu amal buyurtmani
          «yetkazilgan» qiladi.
        </p>

        <FormField
          htmlFor="deliveryLogisticsCost"
          label="Logistika / kuryer chiqimi (ixtiyoriy)"
        >
          <Input
            id="deliveryLogisticsCost"
            type="number"
            min={0}
            step="0.01"
            placeholder="Masalan: 50000"
            disabled={isSubmitting}
            value={deliveryCost}
            onChange={(event) => setDeliveryCost(event.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Bu summa fabrika chiqimi — Transport kategoriyasida to‘langan
            xarajat sifatida saqlanadi. Mijoz mahsulot to‘lovi emas.
          </p>
        </FormField>

        <FormField htmlFor="deliveryLogisticsNote" label="Chiqim izohi">
          <Textarea
            id="deliveryLogisticsNote"
            placeholder="Masalan: Yandex / o‘z mashina / kuryer ismi"
            disabled={isSubmitting}
            value={deliveryCostNote}
            onChange={(event) => setDeliveryCostNote(event.target.value)}
          />
        </FormField>

        {localError || errorMessage ? (
          <p
            role="alert"
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            {localError || errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Bekor qilish
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Yetkazilmoqda..." : "Yetkazildi qilish"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
