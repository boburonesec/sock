import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/overlays/drawer";
import { InfoCard } from "@/components/cards/info-card";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import type {
  SupplierDebt,
  SupplierPayment,
  SupplierPurchase,
} from "@/lib/api/supplier";

interface SupplierDetailsDrawerProps {
  debt: SupplierDebt | null;
  purchases: SupplierPurchase[];
  payments: SupplierPayment[];
  isArchiving: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePurchase: (supplierId: string) => void;
  onCreatePayment: (supplierId: string) => void;
  onEdit: (supplier: SupplierDebt["supplier"]) => void;
  onArchive: (supplier: SupplierDebt["supplier"]) => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function SupplierDetailsDrawer({
  debt,
  purchases,
  payments,
  isArchiving,
  onOpenChange,
  onCreatePurchase,
  onCreatePayment,
  onEdit,
  onArchive,
}: SupplierDetailsDrawerProps) {
  if (!debt) return null;

  const supplierPurchases = purchases.filter(
    (purchase) => purchase.supplier.id === debt.supplier.id,
  );
  const supplierPayments = payments.filter(
    (payment) => payment.supplier.id === debt.supplier.id,
  );

  return (
    <Drawer
      open={Boolean(debt)}
      onOpenChange={onOpenChange}
      title={debt.supplier.name}
      description={debt.supplier.phone ?? "Telefon kiritilmagan"}
      className="max-w-4xl"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onCreatePurchase(debt.supplier.id)}>
            Xarid qayd qilish
          </Button>
          <Button
            variant="outline"
            onClick={() => onCreatePayment(debt.supplier.id)}
          >
            To‘lov qayd qilish
          </Button>
          <Button variant="outline" onClick={() => onEdit(debt.supplier)}>
            Tahrirlash
          </Button>
          <Button
            variant="outline"
            disabled={isArchiving}
            onClick={() => onArchive(debt.supplier)}
          >
            {isArchiving ? "Archive qilinmoqda..." : "Archive qilish"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <InfoCard title="Jami xarid">
            <p className="text-xl font-bold">{debt.totalPurchases} so‘m</p>
          </InfoCard>
          <InfoCard title="To‘langan">
            <p className="text-xl font-bold">{debt.totalPaid} so‘m</p>
          </InfoCard>
          <InfoCard title="Qarz">
            <p className="text-xl font-bold text-amber-500">
              {debt.debt} so‘m
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Backend supplier debt projection qiymati.
            </p>
          </InfoCard>
        </div>

        <InfoCard title="Supplier ma’lumoti">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Status: {debt.supplier.status}</p>
            <p>Telefon: {debt.supplier.phone ?? "Kiritilmagan"}</p>
            <p>Izoh: {debt.supplier.notes ?? "Izoh yo‘q"}</p>
          </div>
        </InfoCard>

        <section>
          <p className="mb-3 text-sm font-semibold">Xaridlar tarixi</p>
          <DataTable label="Supplier xaridlari" className="border-0 shadow-none">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeader>Sana</DataTableHeader>
                <DataTableHeader>Purchase</DataTableHeader>
                <DataTableHeader>Status</DataTableHeader>
                <DataTableHeader>Summa</DataTableHeader>
              </DataTableRow>
            </DataTableHead>
            <tbody>
              {supplierPurchases.length > 0 ? (
                supplierPurchases.map((purchase) => (
                  <DataTableRow key={purchase.id}>
                    <DataTableCell>{formatDate(purchase.purchasedAt)}</DataTableCell>
                    <DataTableCell className="font-semibold">
                      {purchase.purchaseNumber}
                    </DataTableCell>
                    <DataTableCell>{purchase.paymentStatus}</DataTableCell>
                    <DataTableCell className="font-semibold">
                      {purchase.totalAmount} so‘m
                    </DataTableCell>
                  </DataTableRow>
                ))
              ) : (
                <EmptyTableState
                  colSpan={4}
                  title="Xaridlar mavjud emas"
                  description="Bu supplier uchun purchase yozuvlari topilmadi."
                />
              )}
            </tbody>
          </DataTable>
        </section>

        <section>
          <p className="mb-3 text-sm font-semibold">To‘lovlar tarixi</p>
          <DataTable label="Supplier to‘lovlari" className="border-0 shadow-none">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeader>Sana</DataTableHeader>
                <DataTableHeader>Summa</DataTableHeader>
                <DataTableHeader>Usul</DataTableHeader>
                <DataTableHeader>Izoh</DataTableHeader>
              </DataTableRow>
            </DataTableHead>
            <tbody>
              {supplierPayments.length > 0 ? (
                supplierPayments.map((payment) => (
                  <DataTableRow key={payment.id}>
                    <DataTableCell>{formatDate(payment.paymentDate)}</DataTableCell>
                    <DataTableCell className="font-semibold">
                      {payment.amount} so‘m
                    </DataTableCell>
                    <DataTableCell>{payment.method}</DataTableCell>
                    <DataTableCell>{payment.note ?? "—"}</DataTableCell>
                  </DataTableRow>
                ))
              ) : (
                <EmptyTableState
                  colSpan={4}
                  title="To‘lovlar mavjud emas"
                  description="Bu supplier uchun payment yozuvlari topilmadi."
                />
              )}
            </tbody>
          </DataTable>
        </section>
      </div>
    </Drawer>
  );
}
