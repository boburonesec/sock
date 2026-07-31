import { InfoCard } from "@/components/cards/info-card";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Button } from "@/components/ui/button";
import type { SupplierDebt, SupplierPayment, SupplierPurchase } from "@/lib/api/supplier";

interface SupplierDetailsPanelProps {
  debt: SupplierDebt | null;
  purchases: SupplierPurchase[];
  payments: SupplierPayment[];
  isArchiving: boolean;
  onCreatePurchase: (supplierId: string) => void;
  onCreatePayment: (supplierId: string) => void;
  onEdit: (supplier: SupplierDebt["supplier"]) => void;
  onArchive: (supplier: SupplierDebt["supplier"]) => void;
}

const paymentStatusLabel: Record<string, string> = { UNPAID: "To‘lanmagan", PARTIALLY_PAID: "Qisman to‘langan", PAID: "To‘langan" };
const paymentMethodLabel: Record<string, string> = { CASH: "Naqd", TRANSFER: "O‘tkazma", OTHER: "Boshqa" };

export function SupplierDetailsPanel({ debt, purchases, payments, isArchiving, onCreatePurchase, onCreatePayment, onEdit, onArchive }: SupplierDetailsPanelProps) {
  if (!debt) return <div className="rounded-xl border border-dashed border-border p-8 text-center"><p className="font-semibold">Yetkazib beruvchi tanlanmagan</p><p className="mt-1 text-sm text-muted-foreground">Profil, qarz va tarixni ko‘rish uchun ro‘yxatdan tanlang.</p></div>;

  const supplierPurchases = purchases.filter((purchase) => purchase.supplier.id === debt.supplier.id);
  const supplierPayments = payments.filter((payment) => payment.supplier.id === debt.supplier.id);
  const isActive = debt.supplier.status === "ACTIVE";
  const canPay = isActive && supplierPurchases.some((purchase) => purchase.cancelledAt === null && purchase.paymentStatus !== "PAID");

  return <section className="min-w-0 space-y-6 rounded-xl border border-border/70 bg-card/30 p-4 sm:p-5" aria-label={`${debt.supplier.name} ish maydoni`}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-semibold">{debt.supplier.name}</h3><StatusBadge tone={isActive ? "success" : "neutral"}>{isActive ? "Faol" : "Nofaol"}</StatusBadge></div><p className="mt-1 text-sm text-muted-foreground">{debt.supplier.phone ?? "Telefon kiritilmagan"}</p></div>
      {isActive ? <div className="flex flex-col gap-2 sm:flex-row"><Button onClick={() => onCreatePurchase(debt.supplier.id)}>Yangi xarid</Button>{canPay ? <Button variant="outline" onClick={() => onCreatePayment(debt.supplier.id)}>To‘lov kiritish</Button> : null}</div> : null}
    </div>

    <div className="grid gap-3 sm:grid-cols-3"><InfoCard title="Jami xarid"><p className="text-xl font-bold">{debt.totalPurchases} so‘m</p></InfoCard><InfoCard title="To‘langan"><p className="text-xl font-bold">{debt.totalPaid} so‘m</p></InfoCard><InfoCard title="Hozirgi qarz"><p className="text-xl font-bold text-amber-500">{debt.debt} so‘m</p></InfoCard></div>
    <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">Qarz = bekor qilinmagan xaridlar jami ({debt.totalPurchases} so‘m) − xaridlarga taqsimlangan to‘lovlar ({debt.totalPaid} so‘m).</p>
    {isActive && !canPay ? <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">To‘lanmagan xarid yo‘q. Yangi to‘lov kiritib bo‘lmaydi.</p> : null}

    <HistorySection title="Xaridlar tarixi" empty="Bu yetkazib beruvchi uchun xarid mavjud emas.">{supplierPurchases.map((purchase) => <article key={purchase.id} className="rounded-lg border border-border/60 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{purchase.purchaseNumber}</p><p className="mt-1 text-sm text-muted-foreground">{formatDate(purchase.purchasedAt)} · {purchase.items.map((item) => item.material.name).join(", ")}</p></div><div className="text-right"><p className="font-semibold">{purchase.totalAmount} so‘m</p><p className="text-sm text-muted-foreground">{paymentStatusLabel[purchase.paymentStatus] ?? purchase.paymentStatus}</p></div></div></article>)}</HistorySection>
    <HistorySection title="To‘lovlar tarixi" empty="Bu yetkazib beruvchi uchun to‘lov mavjud emas.">{supplierPayments.map((payment) => <article key={payment.id} className="rounded-lg border border-border/60 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{formatDate(payment.paymentDate)} · {paymentMethodLabel[payment.method] ?? payment.method}</p><p className="mt-1 text-sm text-muted-foreground">{payment.allocations.map((allocation) => allocation.purchase.purchaseNumber).join(", ") || "Xarid ko‘rsatilmagan"}</p></div><p className="font-semibold">{payment.amount} so‘m</p></div>{payment.note ? <p className="mt-2 text-sm text-muted-foreground">{payment.note}</p> : null}</article>)}</HistorySection>

    <div className="border-t border-border/60 pt-5"><p className="font-semibold">Profil boshqaruvi</p><p className="mt-1 text-sm text-muted-foreground">Telefon: {debt.supplier.phone ?? "kiritilmagan"} · Izoh: {debt.supplier.notes ?? "yo‘q"}</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={() => onEdit(debt.supplier)}>Profilni tahrirlash</Button>{isActive ? <Button variant="outline" disabled={isArchiving} onClick={() => onArchive(debt.supplier)}>{isArchiving ? "Arxivlanmoqda..." : "Arxivlash"}</Button> : null}</div></div>
  </section>;
}

function HistorySection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) { return <section><div className="mb-3 flex items-center justify-between gap-3"><h4 className="font-semibold">{title}</h4><span className="text-sm text-muted-foreground">{children.length} ta</span></div><div className="space-y-2">{children.length > 0 ? children : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{empty}</p>}</div></section>; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium" }).format(new Date(value)); }
