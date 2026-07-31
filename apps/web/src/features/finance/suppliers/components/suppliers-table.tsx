import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { SupplierDebt } from "@/lib/api/supplier";

const statusTone: Record<string, StatusTone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
};

export function SuppliersTable({
  debts,
  selectedSupplierId,
  onSelect,
}: {
  debts: SupplierDebt[];
  selectedSupplierId: string | null;
  onSelect: (debt: SupplierDebt) => void;
}) {
  return (
    <>
    <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1" aria-label="Yetkazib beruvchilar ro‘yxati">
      {debts.length > 0 ? debts.map((debt) => (
        <button key={debt.supplier.id} type="button" aria-pressed={debt.supplier.id === selectedSupplierId} onClick={() => onSelect(debt)} className={`min-h-12 w-full rounded-xl border p-4 text-left ${debt.supplier.id === selectedSupplierId ? "border-primary bg-primary/5" : "border-border/70 bg-card/40"}`}>
          <span className="flex items-start justify-between gap-3"><span><span className="block font-semibold">{debt.supplier.name}</span><span className="mt-1 block text-sm text-muted-foreground">{debt.supplier.phone ?? "Telefon kiritilmagan"}</span></span><StatusBadge tone={statusTone[debt.supplier.status] ?? "neutral"}>{statusLabel[debt.supplier.status] ?? debt.supplier.status}</StatusBadge></span>
          <span className="mt-3 grid grid-cols-2 gap-3 text-sm"><span><span className="block text-muted-foreground">Jami xarid</span>{debt.totalPurchases} so‘m</span><span><span className="block text-muted-foreground">Hozirgi qarz</span><strong>{debt.debt} so‘m</strong></span></span>
        </button>
      )) : <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Hozircha yetkazib beruvchi mavjud emas.</div>}
    </div>
    </>
  );
}
